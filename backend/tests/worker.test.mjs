import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker, { hash } from '../worker.mjs';

async function fixture() {
  const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0001_blog.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../migrations/0002_contributions.sql',import.meta.url),'utf8'));
  const DB={prepare(sql){const bind=(...args)=>({first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})});return {bind,first:()=>bind().first(),all:()=>bind().all(),run:()=>bind().run()};},async batch(items){db.exec('BEGIN');try{const results=[];for(const item of items)results.push(await item.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}};
  const env={DB,SITE_ORIGIN:'https://luotiany1.top',API_ORIGIN:'https://blog-api.luotiany1.top',ADMIN_GITHUB_ID:'1',GITHUB_REPOSITORY:'tomh500/tomh500.github.io',GITHUB_BRANCH:'nextgen',GITHUB_CLIENT_ID:'test-id',GITHUB_CLIENT_SECRET:'test-secret',ASSETS:{fetch:async()=>new Response('admin')}};
  for(const [id,login] of [['1','owner'],['2','reader'],['3','another-reader']]){
    db.prepare('INSERT INTO users VALUES (?,?,?)').run(id,login,'https://avatars.githubusercontent.com/u/'+id);
    db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(await hash('token-'+id),id,Math.floor(Date.now()/1000)+3600);
  }
  const call=async(path,{method='GET',data,who,origin=env.API_ORIGIN,cookie=''}={})=>worker.fetch(new Request(env.API_ORIGIN+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:who?'__Host-lemoe-session=token-'+who:cookie},...(data===undefined?{}:{body:JSON.stringify(data)})}),env);
  const draft={slug:'first-post',title:'第一篇',summary:'摘要',tags:['C++'],body:'# Hello\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))',version:0};
  return {db,env,call,draft};
}
test('anonymous and ordinary users cannot manage articles; forged Origin is blocked',async()=>{
  const {call,draft}=await fixture();
  assert.equal((await call('/api/admin/posts')).status,401);
  assert.equal((await call('/api/admin/posts',{who:'2'})).status,403);
  assert.equal((await call('/api/admin/posts',{method:'POST',who:'1',origin:'https://evil.example',data:draft})).status,403);
  assert.equal((await call('/api/admin/posts',{method:'POST',who:'1',data:draft})).status,200);
});
test('draft optimistic locking prevents overwrites, duplicates and invalid slugs',async()=>{
  const {call,draft}=await fixture();
  assert.equal((await call('/api/admin/posts',{method:'POST',who:'1',data:draft})).status,200);
  assert.equal((await call('/api/admin/posts',{method:'POST',who:'1',data:draft})).status,409);
  assert.equal((await call('/api/admin/posts',{method:'POST',who:'1',data:{...draft,slug:'../../secrets'}})).status,400);
  assert.equal((await call('/api/admin/posts',{method:'POST',who:'1',data:{...draft,version:1}})).status,200);
  assert.equal((await call('/api/admin/posts',{method:'POST',who:'1',data:{...draft,version:1}})).status,409);
  assert.equal((await call('/api/admin/posts',{who:'2'})).status,403);
  assert.equal((await call('/api/comments?thread=post:first-post')).status,200);
  assert.equal((await call('/api/comments',{method:'POST',who:'2',data:{thread:'post:first-post',body:'not published'}})).status,404);
});
test('preview escapes HTML and rejects unsafe links',async()=>{
  const {call,draft}=await fixture();
  const result=await (await call('/api/admin/preview',{method:'POST',who:'1',data:{body:draft.body}})).json();
  assert.ok(result.html.includes('&lt;script&gt;'));
  assert.ok(!result.html.includes('<script>'));
  assert.ok(!result.html.includes('href="javascript:'));
});
test('image upload requires admin, validates bytes and limits size',async()=>{
  const {env}=await fixture();env.GITHUB_PUBLISH_TOKEN='test';
  const send=(data,who='1')=>{
    const form=new FormData();form.append('image',new File([data],'picture.png',{type:'image/png'}));
    return worker.fetch(new Request(env.API_ORIGIN+'/api/admin/images',{method:'POST',headers:{Origin:env.API_ORIGIN,Cookie:'__Host-lemoe-session=token-'+who},body:form}),env);
  };
  assert.equal((await send('<svg></svg>','2')).status,403);
  assert.equal((await send('<svg></svg>')).status,415);
  assert.equal((await send(new Uint8Array(2*1024*1024+1))).status,413);
});
test('images remain private until the owner publishes an article',async()=>{
  const {env,call,draft,db}=await fixture();env.GITHUB_PUBLISH_TOKEN='test';
  const image=Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64');
  const original=globalThis.fetch;const uploaded=[];
  globalThis.fetch=async(url,options)=>{
    if(!options.method)return new Response('{}',{status:404});
    const data=JSON.parse(options.body);uploaded.push({url,data});
    return Response.json({commit:{sha:'image'}});
  };
  try{
    const form=new FormData();form.append('image',new File([image],'../../wrong.jpg',{type:'image/jpeg'}));
    const response=await worker.fetch(new Request(env.API_ORIGIN+'/api/admin/images',{method:'POST',headers:{Origin:env.API_ORIGIN,Cookie:'__Host-lemoe-session=token-1'},body:form}),env);
    assert.equal(response.status,201);const result=await response.json();
    assert.match(result.url,/^https:\/\/blog-api\.luotiany1\.top\/api\/writing\/images\/[a-f0-9-]{36}$/);
    assert.equal(uploaded.length,0);
    const imagePath=new URL(result.url).pathname;
    assert.equal((await call(imagePath)).status,401);
    assert.equal((await call(imagePath,{who:'2'})).status,404);
    const ownerImage=await call(imagePath,{who:'1'});assert.equal(ownerImage.headers.get('Content-Type'),'image/gif');assert.deepEqual(Buffer.from(await ownerImage.arrayBuffer()),image);
    const preview=await (await call('/api/admin/preview',{method:'POST',who:'1',data:{body:`![Picture](${result.url})`}})).json();
    assert.ok(preview.html.includes(result.url));
    await call('/api/admin/posts',{method:'POST',who:'1',data:{...draft,body:`![Picture](${result.url})`}});
    assert.equal((await call('/api/admin/posts/first-post/publish',{method:'POST',who:'1',data:{}})).status,200);
    assert.equal(uploaded.length,2);assert.match(uploaded[0].url,/\/contents\/images\/blog\/[a-f0-9-]{36}\.gif$/);
    assert.deepEqual(Buffer.from(uploaded[0].data.content,'base64'),image);
    const published=JSON.parse(Buffer.from(uploaded[1].data.content,'base64'));assert.ok(published.body.includes('https://luotiany1.top/images/blog/'));assert.ok(!published.body.includes('/api/writing/images/'));
    assert.equal(db.prepare('SELECT data FROM images').get().data,'');
  }finally{globalThis.fetch=original;}
});
test('guest drafts are isolated, cannot self-publish, and require versioned review',async()=>{
  const {call,draft,env}=await fixture();
  const saved=await (await call('/api/writing/posts',{method:'POST',who:'2',data:{...draft,author_id:'1'}})).json();
  assert.equal(saved.slug,'guest-2-first-post');
  const mine=(await (await call('/api/writing/posts',{who:'2'})).json()).posts;
  assert.equal(mine[0].author_id,'2');assert.equal((await (await call('/api/writing/posts',{who:'3'})).json()).posts.length,0);
  assert.equal((await call('/api/admin/posts/'+saved.slug+'/publish',{method:'POST',who:'2',data:{}})).status,403);
  assert.equal((await call('/api/writing/posts/'+saved.slug+'/publish',{method:'POST',who:'2',data:{}})).status,404);
  await call('/api/writing/posts/'+saved.slug+'/submit',{method:'POST',who:'2',data:{version:1}});
  let queue=(await (await call('/api/admin/submissions',{who:'1'})).json()).posts;assert.equal(queue.length,1);assert.equal(queue[0].review_state,'pending');
  assert.equal((await call('/api/admin/posts/'+saved.slug+'/reject',{method:'POST',who:'1',data:{version:99,note:'stale'}})).status,409);
  await call('/api/admin/posts/'+saved.slug+'/reject',{method:'POST',who:'1',data:{version:1,note:'请补充'}});
  assert.equal((await (await call('/api/writing/posts',{who:'2'})).json()).posts[0].review_note,'请补充');
  await call('/api/writing/posts',{method:'POST',who:'2',data:{...draft,slug:saved.slug,version:1}});
  await call('/api/writing/posts/'+saved.slug+'/submit',{method:'POST',who:'2',data:{version:2}});
  env.GITHUB_PUBLISH_TOKEN='test';const original=globalThis.fetch;let published;
  globalThis.fetch=async(url,options={})=>{if(!options.method)return new Response('{}',{status:404});published=JSON.parse(Buffer.from(JSON.parse(options.body).content,'base64'));return Response.json({commit:{sha:'approved'}});};
  try{
    assert.equal((await call('/api/admin/posts/'+saved.slug+'/publish',{method:'POST',who:'1',data:{version:1}})).status,409);
    assert.equal((await call('/api/admin/posts/'+saved.slug+'/publish',{method:'POST',who:'1',data:{version:2}})).status,200);
    assert.equal(published.community,true);assert.equal(published.author,'reader');
    await call('/api/writing/posts',{method:'POST',who:'2',data:{...draft,slug:saved.slug,version:2,body:'unreviewed revision'}});
    assert.equal((await call('/api/admin/posts/'+saved.slug+'/publish',{method:'POST',who:'1',data:{version:3}})).status,409);
  }finally{globalThis.fetch=original;}
});
test('comments stay private until approved; rate limit, moderation and logout work',async()=>{
  const {call,db}=await fixture();
  const data={thread:'guestbook',body:'<script>plain text</script>'};
  assert.equal((await call('/api/comments',{method:'POST',data})).status,401);
  assert.equal((await call('/api/comments',{method:'POST',who:'2',data})).status,201);
  assert.equal((await call('/api/comments',{method:'POST',who:'2',data})).status,429);
  assert.equal((await (await call('/api/comments?thread=guestbook')).json()).comments.length,0);
  const comment=db.prepare('SELECT * FROM comments').get();
  assert.equal((await call('/api/admin/comments/'+comment.id,{method:'PATCH',who:'2',data:{status:'approved'}})).status,403);
  assert.equal((await call('/api/admin/comments/'+comment.id,{method:'PATCH',who:'1',data:{status:'approved'}})).status,200);
  assert.equal((await (await call('/api/comments?thread=guestbook')).json()).comments[0].body,data.body);
  await call('/api/admin/comments/'+comment.id,{method:'PATCH',who:'1',data:{status:'rejected'}});
  assert.equal((await (await call('/api/comments?thread=guestbook')).json()).comments.length,0);
  await call('/api/logout',{method:'POST',who:'1'});
  assert.equal((await call('/api/admin/posts',{who:'1'})).status,401);
});
test('comment pagination retains messages with equal timestamps',async()=>{
  const {call,db}=await fixture();
  for(let i=0;i<51;i++)db.prepare("INSERT INTO comments VALUES (?,?,?,?,'approved',?)").run(crypto.randomUUID(),'guestbook','2',String(i),100);
  const first=(await (await call('/api/comments?thread=guestbook')).json()).comments;
  const last=first.at(-1);
  const second=(await (await call(`/api/comments?thread=guestbook&before=${last.created}&beforeId=${last.id}`)).json()).comments;
  assert.equal(first.length,50);assert.equal(second.length,1);
  assert.ok(!first.some(c=>c.id===second[0].id));
});
test('OAuth denies external return URLs, mismatched cookies, and consumed state',async()=>{
  const {call,db}=await fixture();
  assert.equal((await call('/auth/login?returnTo=https://evil.example')).status,400);
  const login=await call('/auth/login');assert.equal(login.status,302);
  const state=new URL(login.headers.get('Location')).searchParams.get('state');
  assert.equal((await call('/auth/callback?state='+state+'&code=x')).status,400);
  // Missing authorization code consumes the one-time state; replay is rejected.
  assert.equal((await call('/auth/callback?state='+state,{cookie:'__Host-lemoe-oauth='+state})).status,400);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM oauth_states').get().n,0);
  assert.equal((await call('/auth/callback?state='+state+'&code=x',{cookie:'__Host-lemoe-oauth='+state})).status,400);
});
test('publishing commits only published Markdown and reports GitHub conflicts',async()=>{
  const {call,env,draft,db}=await fixture();
  await call('/api/admin/posts',{method:'POST',who:'1',data:draft});
  assert.equal((await call('/api/admin/posts/first-post/publish',{method:'POST',who:'1',data:{}})).status,503);
  env.GITHUB_PUBLISH_TOKEN='test';const original=globalThis.fetch;let writes=0;
  globalThis.fetch=async(url,init={})=>{
    if(!init.method)return new Response('{}',{status:404});
    const data=JSON.parse(init.body),published=JSON.parse(Buffer.from(data.content,'base64').toString('utf8'));
    assert.equal(data.branch,'nextgen');assert.equal(published.title,draft.title);assert.equal(published.body,draft.body);assert.equal(published.version,undefined);
    writes++;return Response.json({commit:{sha:'abc'}});
  };
  try{const response=await call('/api/admin/posts/first-post/publish',{method:'POST',who:'1',data:{}});assert.equal(response.status,200);assert.equal(writes,1);assert.equal(db.prepare('SELECT published_version FROM posts').get().published_version,1);
    globalThis.fetch=async(url,init={})=>init.method?new Response('{}',{status:409}):Response.json({sha:'old'});
    assert.equal((await call('/api/admin/posts/first-post/publish',{method:'POST',who:'1',data:{}})).status,409);
  }finally{globalThis.fetch=original;}
});
