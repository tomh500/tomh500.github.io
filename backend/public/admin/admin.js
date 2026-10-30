(() => {
  'use strict';
  const $ = id => document.getElementById(id), form = $('editor');
  let version = 0, dirty = false, busy = false, posts = [];
  const status = message => { $('status').textContent = message; };
  async function api(path, options = {}) {
    const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || '操作失败');
    return data;
  }
  function values() {
    return { slug: form.elements.slug.value.trim(), title: form.elements.title.value.trim(), summary: form.elements.summary.value.trim(), tags: form.elements.tags.value.split(/[,，]/).map(t=>t.trim()).filter(Boolean), body: form.elements.body.value, version };
  }
  async function work(action) {
    if (busy) return;
    busy = true;
    document.querySelectorAll('button, #editor input, #editor textarea').forEach(b=>b.disabled=true);
    try { await action(); } catch (e) { status(e.message); }
    finally { busy = false; document.querySelectorAll('button, #editor input, #editor textarea').forEach(b=>b.disabled=false); }
  }
  async function list() {
    posts = (await api('/api/admin/posts')).posts;
    $('posts').replaceChildren();
    if (!posts.length) $('posts').textContent = '还没有文章，写下第一篇吧。';
    for (const post of posts) {
      const button = document.createElement('button');
      button.textContent = post.title;
      const small = document.createElement('small');
      small.textContent = post.published_at ? (post.version === post.published_version ? '已发布' : '有未发布修改') : '草稿';
      button.append(small);
      button.onclick = () => {
        if (dirty && !confirm('当前修改尚未保存，确定切换文章？可以先导出 Markdown 备份。')) return;
        for (const key of ['title','slug','summary','body']) form.elements[key].value = post[key];
        form.elements.tags.value = post.tags.join(', ');
        form.elements.slug.readOnly = true; version = post.version; dirty = false;
        $('draft-state').textContent = '云端草稿 · ' + new Date(post.updated_at).toLocaleString();
        $('unpublish').hidden = !post.published_at;
        $('preview-content').hidden = true;
      };
      $('posts').append(button);
    }
  }
  async function save() {
    if (!form.reportValidity()) throw Error('请补齐标题、地址与正文');
    const result = await api('/api/admin/posts', { method:'POST', body:JSON.stringify(values()) });
    version = result.version; dirty = false; form.elements.slug.readOnly = true;
    $('draft-state').textContent = '草稿已保存 · ' + new Date().toLocaleTimeString();
    await list();
  }
  form.oninput = () => { dirty = true; $('draft-state').textContent = '有未保存修改'; };
  form.onsubmit = e => { e.preventDefault(); work(async()=>{ await save(); status('草稿已保存'); }); };
  $('new').onclick = () => {
    if (dirty && !confirm('当前修改尚未保存，确定新建文章？')) return;
    form.reset(); version=0; dirty=false; form.elements.slug.readOnly=false;
    $('draft-state').textContent='尚未保存'; $('unpublish').hidden=true; $('preview-content').hidden=true; form.elements.title.focus();
  };
  $('publish').onclick = () => { if(!form.reportValidity())return; return work(async()=>{
    await save();
    const result = await api('/api/admin/posts/'+values().slug+'/publish',{method:'POST',body:'{}'});
    status(result.message); $('unpublish').hidden=false; await list();
  }); };
  $('unpublish').onclick = () => work(async()=>{
    if (!confirm('确定下线这篇文章？GitHub Pages 构建完成后生效，草稿会保留。')) return;
    const result = await api('/api/admin/posts/'+values().slug+'/unpublish',{method:'POST',body:'{}'});
    status(result.message); $('unpublish').hidden=true; await list();
  });
  $('export').onclick = () => {
    const p=values(), blob=new Blob([`# ${p.title}\n\n${p.body}\n`],{type:'text/markdown;charset=utf-8'}), link=document.createElement('a');
    link.href=URL.createObjectURL(blob); link.download=(p.slug||'draft')+'.md'; link.click(); URL.revokeObjectURL(link.href);
  };
  $('preview').onclick = () => work(async()=>{
    const response=await fetch('/api/admin/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:values().body})});
    if (!response.ok) { const data=await response.json(); throw Error(data.error||'预览失败'); }
    const data=await response.json();
    // The Worker renderer disables raw HTML and unsafe Markdown URL schemes.
    $('preview-content').innerHTML=data.html; $('preview-content').hidden=false;
  });
  function tab(comments) { $('writing').hidden=comments; $('moderation').hidden=!comments; $('writing-tab').setAttribute('aria-selected',String(!comments)); $('comments-tab').setAttribute('aria-selected',String(comments)); }
  $('writing-tab').onclick=()=>tab(false);
  $('comments-tab').onclick=()=>{tab(true); work(loadComments);};
  $('refresh-comments').onclick=()=>work(loadComments);
  async function loadComments() {
    const rows=(await api('/api/admin/comments')).comments; $('comments').replaceChildren();
    if(!rows.length) $('comments').textContent='暂时没有留言。';
    for(const comment of rows){
      const card=document.createElement('article');card.className='comment';
      const meta=document.createElement('small');meta.textContent=`${comment.login} · ${comment.thread} · ${{pending:'待审核',approved:'已公开',rejected:'已隐藏'}[comment.status]}`;
      const p=document.createElement('p');p.textContent=comment.body;card.append(meta,p);
      for(const [label,method,state] of [['通过','PATCH','approved'],['隐藏','PATCH','rejected'],['删除','DELETE',null]]){
        const button=document.createElement('button');button.textContent=label;
        button.onclick=()=>work(async()=>{ if(method==='DELETE'&&!confirm('确定永久删除这条留言？'))return;await api('/api/admin/comments/'+comment.id,{method,body:JSON.stringify({status:state})});await loadComments();status('留言已处理'); });card.append(button);
      }
      const reply=document.createElement('button');reply.textContent='回复';reply.onclick=()=>work(async()=>{
        const message=prompt('回复 '+comment.login+'（回复将公开显示在同一留言区）');if(!message?.trim())return;
        await api('/api/comments',{method:'POST',body:JSON.stringify({thread:comment.thread,body:'@'+comment.login+' '+message})});await loadComments();status('回复已公开');
      });card.append(reply);$('comments').append(card);
    }
  }
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  api('/api/me').then(async({user})=>{
    $('identity').textContent=user ? user.login : '尚未登录';
    if(!user)return;
    const logout=document.createElement('button');logout.textContent='退出';logout.onclick=()=>work(async()=>{if(dirty&&!confirm('有未保存修改，确定退出？'))return;await api('/api/logout',{method:'POST',body:'{}'});dirty=false;location.reload();});$('identity').append(' ',logout);
    if(!user.admin){$('welcome').querySelector('p:not(.eyebrow)').textContent='你已登录。写作台仅对站长开放，可以回到博客留言。';$('login').hidden=true;return;}
    $('welcome').hidden=true;$('workspace').hidden=false;await list();
  }).catch(e=>status(e.message));
})();
