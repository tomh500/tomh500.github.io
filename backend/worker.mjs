import MarkdownIt from 'markdown-it';
const encoder = new TextEncoder();
const imageLimit = 1024 * 1024;
function base64(bytes) {
  const chunks = [];
  for (let offset = 0; offset < bytes.length; offset += 8192) chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)));
  return btoa(chunks.join(''));
}
export function imageType(bytes) {
  const starts = values => values.every((value, i) => bytes[i] === value);
  if (starts([137,80,78,71,13,10,26,10])) return 'png';
  if (starts([255,216,255])) return 'jpg';
  const head = new TextDecoder().decode(bytes.subarray(0,12));
  if (head.startsWith('GIF87a') || head.startsWith('GIF89a')) return 'gif';
  if (head.startsWith('RIFF') && head.slice(8,12) === 'WEBP') return 'webp';
  return null;
}
async function boundedBytes(request, limit) {
  if (Number(request.headers.get('Content-Length')) > limit) fail(413, '图片最大支持 1 MB，请压缩后重试');
  if (!request.body) fail(400, '未选择图片');
  const reader = request.body.getReader(), chunks = []; let length = 0;
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    length += value.length;
    if (length > limit) { await reader.cancel(); fail(413, '图片最大支持 1 MB，请压缩后重试'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
const now = () => Math.floor(Date.now() / 1000);
const random = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
export const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))), b => b.toString(16).padStart(2, '0')).join('');
export const validSlug = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
const validThread = value => value === 'guestbook' || (typeof value === 'string' && value.startsWith('post:') && validSlug(value.slice(5)));
function fail(status, message) { throw Object.assign(new Error(message), { status }); }
function json(data, status = 200) { return Response.json(data, { status }); }
function cookie(request, name) {
  return request.headers.get('Cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='))?.slice(name.length + 1) || '';
}
function setCookie(name, value, age) { return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`; }
async function body(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) fail(415, '需要 JSON 请求');
  if (Number(request.headers.get('Content-Length')) > 160000) fail(413, '内容过长');
  const raw = await request.text();
  if (encoder.encode(raw).length > 160000) fail(413, '内容过长');
  try { const data = JSON.parse(raw); if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error(); return data; }
  catch { fail(400, 'JSON 格式不正确'); }
}
function text(value, max, required = true) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(400, '内容为空或超过长度限制');
  return value.trim();
}
async function user(request, env, admin = false) {
  const token = cookie(request, '__Host-lemoe-session');
  if (!token) fail(401, '请先登录 GitHub');
  const row = await env.DB.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires>?').bind(await hash(token), now()).first();
  if (!row) fail(401, '登录已过期，请重新登录');
  row.admin = !!env.ADMIN_GITHUB_ID && row.id === env.ADMIN_GITHUB_ID;
  if (admin && !row.admin) fail(403, '只有站长可以执行此操作');
  return row;
}
async function github(env, path, init = {}, token = env.GITHUB_PUBLISH_TOKEN) {
  const response = await fetch('https://api.github.com' + path, {
    ...init, headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'Lemoe-Blog', 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' }
  });
  if (!response.ok) fail(response.status === 409 ? 409 : 502, response.status === 409 ? '文章已在其他地方更新，请重新同步后发布' : 'GitHub 操作失败，请检查后台配置后重试');
  return response.json();
}
function safeReturn(value, env) {
  try {
    const url = new URL(value || '/admin/', env.API_ORIGIN);
    if (![env.SITE_ORIGIN, env.API_ORIGIN].includes(url.origin)) fail(400, '不允许的返回地址');
    if (url.username || url.password) fail(400, '不允许的返回地址');
    return url.href;
  } catch { fail(400, '不允许的返回地址'); }
}
async function auth(request, env, url) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.ADMIN_GITHUB_ID) fail(503, '登录服务尚未配置');
  if (url.pathname === '/auth/login') {
    const state = random();
    const returnTo = safeReturn(url.searchParams.get('returnTo'), env);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM oauth_states WHERE expires<?').bind(now()),
      env.DB.prepare('DELETE FROM sessions WHERE expires<?').bind(now()),
      env.DB.prepare('INSERT INTO oauth_states VALUES (?,?,?)').bind(await hash(state), returnTo, now() + 600)
    ]);
    const destination = new URL('https://github.com/login/oauth/authorize');
    destination.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    destination.searchParams.set('redirect_uri', env.API_ORIGIN + '/auth/callback');
    destination.searchParams.set('state', state);
    destination.searchParams.set('code_challenge', btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(state))))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', ''));
    destination.searchParams.set('code_challenge_method', 'S256');
    return new Response(null, { status: 302, headers: { Location: destination.href, 'Set-Cookie': setCookie('__Host-lemoe-oauth', state, 600) } });
  }
  const state = url.searchParams.get('state');
  if (!state || state !== cookie(request, '__Host-lemoe-oauth')) fail(400, '登录验证失败，请重新登录');
  const saved = await env.DB.prepare('DELETE FROM oauth_states WHERE token_hash=? AND expires>? RETURNING return_to').bind(await hash(state), now()).first();
  if (!saved || !url.searchParams.get('code')) fail(400, '登录请求已过期或被拒绝');
  const exchange = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code: url.searchParams.get('code'), redirect_uri: env.API_ORIGIN + '/auth/callback', code_verifier: state }) });
  const result = await exchange.json();
  if (!exchange.ok || !result.access_token) fail(401, 'GitHub 登录失败');
  const profile = await github(env, '/user', {}, result.access_token);
  const id = String(profile.id);
  if (!/^\d+$/.test(id) || !profile.login) fail(401, '无法验证 GitHub 身份');
  const session = random();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO users VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET login=excluded.login,avatar=excluded.avatar').bind(id, profile.login, `https://avatars.githubusercontent.com/u/${id}?s=80`),
    env.DB.prepare('INSERT INTO sessions VALUES (?,?,?)').bind(await hash(session), id, now() + 604800)
  ]);
  const headers = new Headers({ Location: safeReturn(saved.return_to, env) });
  headers.append('Set-Cookie', setCookie('__Host-lemoe-session', session, 604800));
  headers.append('Set-Cookie', setCookie('__Host-lemoe-oauth', '', 0));
  return new Response(null, { status: 302, headers });
}
async function savePost(request, env, me) {
  const data = await body(request);
  if (!validSlug(data.slug)) fail(400, '文章地址只能用小写字母、数字、短横线，最长 80 位');
  let slug = data.slug;
  if (!me.admin && !slug.startsWith(`guest-${me.id}-`)) slug = `guest-${me.id}-${slug}`;
  if (!validSlug(slug)) fail(400, '文章地址过长，请使用更短的地址');
  if (!Array.isArray(data.tags) || data.tags.length > 8 || data.tags.some(t => typeof t !== 'string' || t.length > 24)) fail(400, '标签格式不正确');
  const title=text(data.title,160),summary=text(data.summary,500,false),content=text(data.body,60000),version=Number(data.version||0),stamp=new Date().toISOString();
  if (!Number.isSafeInteger(version) || version<0) fail(400,'版本不正确');
  const existing=await env.DB.prepare('SELECT author_id FROM posts WHERE slug=?').bind(slug).first();
  if(existing && (existing.author_id || env.ADMIN_GITHUB_ID)!==me.id) fail(403,'只能编辑自己的文章');
  let result;
  if(version===0){
    if(!me.admin){const count=await env.DB.prepare('SELECT COUNT(*) n FROM posts WHERE author_id=?').bind(me.id).first();if(count.n>=50)fail(429,'投稿最多保留 50 篇，请联系站长整理');}
    result=await env.DB.prepare("INSERT INTO posts (slug,title,summary,tags,body,version,updated_at,author_id) VALUES (?,?,?,?,?,1,?,?) ON CONFLICT(slug) DO NOTHING").bind(slug,title,summary,JSON.stringify(data.tags),content,stamp,me.id).run();
  }else{
    result=await env.DB.prepare("UPDATE posts SET title=?,summary=?,tags=?,body=?,version=version+1,updated_at=?,review_state='draft',submitted_version=NULL,review_note='' WHERE slug=? AND version=? AND COALESCE(author_id,?)=?").bind(title,summary,JSON.stringify(data.tags),content,stamp,slug,version,env.ADMIN_GITHUB_ID,me.id).run();
  }
  if(!result.meta.changes)fail(409,'地址已存在或草稿已更新，请重新打开文章后重试');
  return json({slug,version:version+1});
}
async function publicImages(env, post) {
  let content=post.body;
  const prefix=env.API_ORIGIN+'/api/writing/images/';
  const escaped=prefix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const ids=[...new Set([...content.matchAll(new RegExp(escaped+'([a-f0-9-]{36})','g'))].map(m=>m[1]))];
  if(ids.length>20)fail(400,'每篇文章最多使用 20 张上传图片');
  for(const id of ids){
    const image=await env.DB.prepare('SELECT * FROM images WHERE id=? AND user_id=?').bind(id,post.author_id||env.ADMIN_GITHUB_ID).first();
    if(!image)fail(400,'文章中包含无权使用或已失效的图片');
    const filePath=image.public_path||`images/blog/${image.id}.${image.extension}`;
    if(!image.public_path){
      try { await github(env,`/repos/${env.GITHUB_REPOSITORY}/contents/${filePath}`,{method:'PUT',body:JSON.stringify({message:'Publish approved blog image',branch:env.GITHUB_BRANCH,content:image.data})}); }
      catch(e){
        if(e.status!==409)throw e;
        const existing=await github(env,`/repos/${env.GITHUB_REPOSITORY}/contents/${filePath}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`);
        if(existing.content?.replace(/\s/g,'')!==image.data)throw e;
      }
      await env.DB.prepare("UPDATE images SET public_path=?,data='' WHERE id=?").bind(filePath,id).run();
    }
    content=content.replaceAll(prefix+id,env.SITE_ORIGIN+'/'+filePath);
  }
  return content;
}
async function publish(env, slug, unpublish, expectedVersion) {
  if (!env.GITHUB_PUBLISH_TOKEN) fail(503, '尚未配置 GitHub 发布凭据');
  const post = await env.DB.prepare('SELECT * FROM posts WHERE slug=?').bind(slug).first();
  if (!post) fail(404, '文章不存在');
  const community=!!post.author_id && post.author_id!==env.ADMIN_GITHUB_ID;
  if(community&&!unpublish&&(post.review_state!=='pending'||post.submitted_version!==post.version||expectedVersion!==post.version))fail(409,'投稿已修改或尚未提交审核，请刷新后重新审核');
  const path = `/repos/${env.GITHUB_REPOSITORY}/contents/content/posts/${slug}.json`;
  // A missing file is expected for the first publication; other errors must not be ignored.
  const existing = await fetch('https://api.github.com' + path + '?ref=' + encodeURIComponent(env.GITHUB_BRANCH), { headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'Lemoe-Blog', 'Authorization': `Bearer ${env.GITHUB_PUBLISH_TOKEN}` } });
  if (!existing.ok && existing.status !== 404) fail(502, '无法读取 GitHub 上的文章');
  const file = existing.ok ? await existing.json() : null;
  const date = post.published_at || new Date().toISOString();
  if (unpublish) {
    if (file) await github(env, path, { method: 'DELETE', body: JSON.stringify({ message: `Unpublish ${slug}`, sha: file.sha, branch: env.GITHUB_BRANCH }) });
    await env.DB.prepare('UPDATE posts SET published_at=NULL,published_version=NULL WHERE slug=?').bind(slug).run();
  } else {
    const author=await env.DB.prepare('SELECT login FROM users WHERE id=?').bind(post.author_id||env.ADMIN_GITHUB_ID).first();
    const published = { slug, title: post.title, summary: post.summary, tags: JSON.parse(post.tags), body: await publicImages(env,post), publishedAt: date, updatedAt: post.updated_at, community, author:author?.login||'tomh500' };
    const bytes = encoder.encode(JSON.stringify(published, null, 2) + '\n');
    const result = await github(env, path, { method: 'PUT', body: JSON.stringify({ message: `Publish ${slug}`, content: base64(bytes), ...(file ? { sha: file.sha } : {}), branch: env.GITHUB_BRANCH }) });
    await env.DB.prepare("UPDATE posts SET published_at=?,published_version=?,review_state=CASE WHEN version=? THEN 'approved' ELSE review_state END WHERE slug=?").bind(date,post.version,post.version,slug).run();
    return json({ message: '已提交到 GitHub，等待 Pages 构建上线', commit: result.commit.sha });
  }
  return json({ message: '已提交下线请求，Pages 构建完成后生效；草稿保留' });
}
async function route(request, env) {
  const url = new URL(request.url); let path = url.pathname;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (!['GET', 'HEAD'].includes(request.method)) {
    // Reject cross-site writes, including form submissions. Session cookies are never enough on their own.
    if (![env.SITE_ORIGIN, env.API_ORIGIN].includes(request.headers.get('Origin'))) fail(403, '不允许的请求来源');
  }
  if (request.method === 'GET' && ['/auth/login', '/auth/callback'].includes(path)) return auth(request, env, url);
  if (path === '/api/me' && request.method === 'GET') {
    try { return json({ user: await user(request, env) }); } catch (e) { if (e.status === 401) return json({ user: null }); throw e; }
  }
  if (path === '/api/logout' && request.method === 'POST') {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(cookie(request, '__Host-lemoe-session'))).run();
    return new Response('{}', { headers: { 'Content-Type': 'application/json', 'Set-Cookie': setCookie('__Host-lemoe-session', '', 0) } });
  }
  if (path === '/api/comments' && request.method === 'GET') {
    const thread = url.searchParams.get('thread');
    if (!validThread(thread)) fail(400, '留言位置不正确');
    const before = Number(url.searchParams.get('before') || Number.MAX_SAFE_INTEGER);
    if (!Number.isSafeInteger(before) || before < 1) fail(400, '分页参数不正确');
    const beforeId = url.searchParams.get('beforeId') || '';
    if (beforeId && !/^[a-f0-9-]{36}$/.test(beforeId)) fail(400, '分页参数不正确');
    const rows = await env.DB.prepare("SELECT c.id,c.body,c.created,u.login,u.avatar FROM comments c JOIN users u ON u.id=c.user_id WHERE c.thread=? AND c.status='approved' AND (c.created<? OR (c.created=? AND c.id<?)) ORDER BY c.created DESC,c.id DESC LIMIT 50").bind(thread, before, before, beforeId).all();
    return json({ comments: rows.results });
  }
  if (path === '/api/comments' && request.method === 'POST') {
    const me = await user(request, env), data = await body(request);
    if (!validThread(data.thread)) fail(400, '留言位置不正确');
    if (data.thread !== 'guestbook' && !await env.DB.prepare('SELECT slug FROM posts WHERE slug=? AND published_at IS NOT NULL').bind(data.thread.slice(5)).first()) fail(404, '文章未发布');
    const message = text(data.body, 2000);
    if (env.TURNSTILE_SECRET && !me.admin) {
      const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: text(data.turnstileToken, 2048), remoteip: request.headers.get('CF-Connecting-IP') || '' }) });
      const checked = await verify.json();
      if (!checked.success || checked.hostname !== new URL(env.SITE_ORIGIN).hostname) fail(400, '验证未通过，请重新验证');
    }
    const result = await env.DB.prepare("INSERT INTO comments (id,thread,user_id,body,status,created) SELECT ?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM comments WHERE user_id=? AND created>?)").bind(crypto.randomUUID(), data.thread, me.id, message, me.admin ? 'approved' : 'pending', now(), me.id, now() - 30).run();
    if (!result.meta.changes) fail(429, '请稍等 30 秒后再留言');
    return json({ message: me.admin ? '回复已公开' : '留言已提交，审核通过后公开' }, 201);
  }
  const writing=path.startsWith('/api/writing/');
  if(writing){
    const me=await user(request,env);
    const image=path.match(/^\/api\/writing\/images\/([a-f0-9-]{36})$/);
    if(image&&request.method==='GET'){
      const row=await env.DB.prepare('SELECT * FROM images WHERE id=?').bind(image[1]).first();
      if(!row||(!me.admin&&row.user_id!==me.id))fail(404,'图片不存在');
      if(row.public_path)return Response.redirect(`https://raw.githubusercontent.com/${env.GITHUB_REPOSITORY}/${encodeURIComponent(env.GITHUB_BRANCH)}/${row.public_path}`,302);
      return new Response(Uint8Array.from(atob(row.data),c=>c.charCodeAt(0)),{headers:{'Content-Type':`image/${row.extension==='jpg'?'jpeg':row.extension}`,'Content-Disposition':'inline'}});
    }
    if(path==='/api/writing/posts'&&request.method==='GET'){
      const rows=await env.DB.prepare('SELECT * FROM posts WHERE COALESCE(author_id,?)=? ORDER BY updated_at DESC LIMIT 200').bind(env.ADMIN_GITHUB_ID,me.id).all();
      return json({posts:rows.results.map(p=>({...p,tags:JSON.parse(p.tags)}))});
    }
    if(path==='/api/writing/posts'&&request.method==='POST')return savePost(request,env,me);
    const submit=path.match(/^\/api\/writing\/posts\/([a-z0-9-]+)\/submit$/);
    if(submit&&request.method==='POST'){
      const data=await body(request);
      const result=await env.DB.prepare("UPDATE posts SET review_state='pending',submitted_version=version,review_note='' WHERE slug=? AND author_id=? AND version=? AND (published_version IS NULL OR published_version<>version)").bind(submit[1],me.id,Number(data.version)).run();
      if(!result.meta.changes)fail(409,'草稿已变化或已经发布，请重新打开文章');
      return json({message:'投稿已提交，站长审核通过后会展示在访客投稿页面'});
    }
    if(!['/api/writing/images','/api/writing/preview'].includes(path))fail(404,'接口不存在');
    path=path.replace('/api/writing/','/api/admin/');
  }
  if (path.startsWith('/api/admin/')) {
    const me=await user(request, env, !writing);
    if (path === '/api/admin/images' && request.method === 'POST') {
      const contentType = request.headers.get('Content-Type') || '';
      if (!contentType.startsWith('multipart/form-data;')) fail(415, '请选择图片文件');
      const bytes = await boundedBytes(request, imageLimit + 65536);
      let form;
      try { form = await new Response(bytes, { headers: { 'Content-Type': contentType } }).formData(); }
      catch { fail(400, '图片上传格式不正确'); }
      const file = form.get('image');
      if (!file || typeof file.arrayBuffer !== 'function' || !file.size) fail(400, '未选择图片');
      if (file.size > imageLimit) fail(413, '图片最大支持 1 MB，请压缩后重试');
      const data = new Uint8Array(await file.arrayBuffer()), extension = imageType(data);
      if (!extension) fail(415, '仅支持 PNG、JPEG、GIF、WebP 图片');
      const id=crypto.randomUUID();
      const saved=await env.DB.prepare('INSERT INTO images (id,user_id,extension,data,size,created) SELECT ?,?,?,?,?,? WHERE (SELECT COALESCE(SUM(size),0) FROM images WHERE user_id=? AND public_path IS NULL)+?<=? AND (SELECT COUNT(*) FROM images WHERE user_id=? AND created>?)<10').bind(id,me.id,extension,base64(data),file.size,now(),me.id,file.size,me.admin?52428800:10485760,me.id,now()-60).run();
      if(!saved.meta.changes)fail(429,'图片上传过于频繁或待发布图片空间已满');
      return json({ url:env.API_ORIGIN + '/api/writing/images/' + id }, 201);
    }
    if (path === '/api/admin/preview' && request.method === 'POST') {
      const data = await body(request);
      const preview = new MarkdownIt({ html:false });
      const renderImage = preview.renderer.rules.image;
      preview.renderer.rules.image = (tokens, index, options, context, renderer) => {
        const source = tokens[index].attrGet('src');
        const prefix = env.SITE_ORIGIN + '/images/blog/';
        if (source?.startsWith(prefix) && /^[a-f0-9-]{36}\.(png|jpg|gif|webp)$/.test(source.slice(prefix.length))) {
          tokens[index].attrSet('src', `https://raw.githubusercontent.com/${env.GITHUB_REPOSITORY}/${encodeURIComponent(env.GITHUB_BRANCH)}/images/blog/${source.slice(prefix.length)}`);
        }
        return renderImage(tokens, index, options, context, renderer);
      };
      return json({ html: preview.render(text(data.body, 60000, false)) });
    }
    if (path === '/api/admin/posts' && request.method === 'GET') {
      const rows = await env.DB.prepare('SELECT * FROM posts ORDER BY updated_at DESC LIMIT 200').all();
      return json({ posts: rows.results.map(p => ({ ...p, tags: JSON.parse(p.tags) })) });
    }
    if (path === '/api/admin/posts' && request.method === 'POST') {
      return savePost(request,env,me);
    }
    if(path==='/api/admin/submissions'&&request.method==='GET'){
      const rows=await env.DB.prepare("SELECT p.*,u.login FROM posts p JOIN users u ON u.id=p.author_id WHERE p.author_id<>? AND (p.review_state IN ('pending','rejected') OR p.published_at IS NOT NULL) ORDER BY p.updated_at DESC LIMIT 200").bind(env.ADMIN_GITHUB_ID).all();
      return json({posts:rows.results.map(p=>({...p,tags:JSON.parse(p.tags)}))});
    }
    const reject=path.match(/^\/api\/admin\/posts\/([a-z0-9-]+)\/reject$/);
    if(reject&&request.method==='POST'){
      const data=await body(request),note=text(data.note||'请修改后重新提交',500);
      const result=await env.DB.prepare("UPDATE posts SET review_state='rejected',review_note=? WHERE slug=? AND version=? AND review_state='pending'").bind(note,reject[1],Number(data.version)).run();
      if(!result.meta.changes)fail(409,'投稿状态已变化，请刷新');return json({ok:true});
    }
    const match = path.match(/^\/api\/admin\/posts\/([a-z0-9-]+)\/(publish|unpublish)$/);
    if (match && request.method === 'POST' && validSlug(match[1])) { const data=await body(request);return publish(env,match[1],match[2]==='unpublish',data.version); }
    if (path === '/api/admin/comments' && request.method === 'GET') {
      const rows = await env.DB.prepare('SELECT c.*,u.login FROM comments c JOIN users u ON u.id=c.user_id ORDER BY c.created DESC LIMIT 200').all();
      return json({ comments: rows.results });
    }
    const comment = path.match(/^\/api\/admin\/comments\/([a-f0-9-]+)$/);
    if (comment && request.method === 'PATCH') {
      const data = await body(request);
      if (!['approved', 'rejected'].includes(data.status)) fail(400, '审核状态不正确');
      await env.DB.prepare('UPDATE comments SET status=? WHERE id=?').bind(data.status,comment[1]).run();
      return json({ ok: true });
    }
    if (comment && request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM comments WHERE id=?').bind(comment[1]).run();
      return json({ ok: true });
    }
    fail(404, '接口不存在');
  }
  if (path === '/api/config' && request.method === 'GET') return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || '' });
  if (path.startsWith('/api/') || path.startsWith('/auth/')) fail(404, '接口不存在');
  if (request.method !== 'GET' && request.method !== 'HEAD') fail(405, '不支持的请求方法');
  if (path === '/') return Response.redirect(env.API_ORIGIN + '/admin/', 302);
  return env.ASSETS.fetch(request);
}
export default {
  async fetch(request, env) {
    let response;
    try { response = await route(request, env); }
    catch (e) { response = json({ error: e.status ? e.message : '服务暂时不可用，请稍后重试' }, e.status || 500); }
    const headers = new Headers(response.headers), origin = request.headers.get('Origin');
    if ([env.SITE_ORIGIN, env.API_ORIGIN].includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Credentials', 'true');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
      headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      headers.set('Vary', 'Origin');
    }
    headers.set('Cache-Control', 'no-store');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    return new Response(response.body, { status: response.status, headers });
  }
};
