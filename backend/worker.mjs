import MarkdownIt from 'markdown-it';
const markdown = new MarkdownIt({ html: false, linkify: false, breaks: false });
const encoder = new TextEncoder();
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
async function publish(env, slug, unpublish) {
  if (!env.GITHUB_PUBLISH_TOKEN) fail(503, '尚未配置 GitHub 发布凭据');
  const post = await env.DB.prepare('SELECT * FROM posts WHERE slug=?').bind(slug).first();
  if (!post) fail(404, '文章不存在');
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
    const published = { slug, title: post.title, summary: post.summary, tags: JSON.parse(post.tags), body: post.body, publishedAt: date, updatedAt: post.updated_at };
    const bytes = encoder.encode(JSON.stringify(published, null, 2) + '\n');
    const result = await github(env, path, { method: 'PUT', body: JSON.stringify({ message: `Publish ${slug}`, content: btoa(Array.from(bytes, b => String.fromCharCode(b)).join('')), ...(file ? { sha: file.sha } : {}), branch: env.GITHUB_BRANCH }) });
    await env.DB.prepare('UPDATE posts SET published_at=?,published_version=? WHERE slug=?').bind(date, post.version, slug).run();
    return json({ message: '已提交到 GitHub，等待 Pages 构建上线', commit: result.commit.sha });
  }
  return json({ message: '已提交下线请求，Pages 构建完成后生效；草稿保留' });
}
async function route(request, env) {
  const url = new URL(request.url), path = url.pathname;
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
  if (path.startsWith('/api/admin/')) {
    await user(request, env, true);
    if (path === '/api/admin/preview' && request.method === 'POST') {
      const data = await body(request);
      return json({ html: markdown.render(text(data.body, 60000, false)) });
    }
    if (path === '/api/admin/posts' && request.method === 'GET') {
      const rows = await env.DB.prepare('SELECT * FROM posts ORDER BY updated_at DESC LIMIT 200').all();
      return json({ posts: rows.results.map(p => ({ ...p, tags: JSON.parse(p.tags) })) });
    }
    if (path === '/api/admin/posts' && request.method === 'POST') {
      const data = await body(request);
      if (!validSlug(data.slug)) fail(400, '文章地址只能用小写字母、数字、短横线，最长 80 位');
      if (!Array.isArray(data.tags) || data.tags.length > 8 || data.tags.some(t => typeof t !== 'string' || t.length > 24)) fail(400, '标签格式不正确');
      const title = text(data.title, 160), summary = text(data.summary, 500, false), content = text(data.body, 60000);
      const version = Number(data.version || 0);
      if (!Number.isSafeInteger(version) || version < 0) fail(400, '版本不正确');
      const stamp = new Date().toISOString();
      if (version === 0) {
        const result = await env.DB.prepare('INSERT INTO posts (slug,title,summary,tags,body,version,updated_at) VALUES (?,?,?,?,?,1,?) ON CONFLICT(slug) DO NOTHING').bind(data.slug,title,summary,JSON.stringify(data.tags),content,stamp).run();
        if (!result.meta.changes) fail(409, '地址已存在，请打开已有草稿或换一个地址');
      } else {
        const result = await env.DB.prepare('UPDATE posts SET title=?,summary=?,tags=?,body=?,version=version+1,updated_at=? WHERE slug=? AND version=?').bind(title,summary,JSON.stringify(data.tags),content,stamp,data.slug,version).run();
        if (!result.meta.changes) fail(409, '草稿已更新，请先备份当前文字并重新打开文章');
      }
      return json({ version: version + 1 });
    }
    const match = path.match(/^\/api\/admin\/posts\/([a-z0-9-]+)\/(publish|unpublish)$/);
    if (match && request.method === 'POST' && validSlug(match[1])) return publish(env, match[1], match[2] === 'unpublish');
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
