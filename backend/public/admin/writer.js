(() => {
  'use strict';
  const $=id=>document.getElementById(id), form=$('editor'), rich=$('rich-body');
  const converter=new TurndownService({headingStyle:'atx',codeBlockStyle:'fenced',bulletListMarker:'-'});
  converter.addRule('plainPre',{filter:node=>node.nodeName==='PRE'&&node.firstElementChild?.nodeName!=='CODE',replacement:(_,node)=>'\n\n```\n'+node.textContent+'\n```\n\n'});
  let me=null,version=0,dirty=false,busy=false,source=false,bookmark=null;
  const clean=html=>DOMPurify.sanitize(html,{FORBID_ATTR:['style'],FORBID_TAGS:['iframe','form','input','button']});
  const status=message=>{$('status').textContent=message;};
  async function api(path,options={}){
    const response=await fetch(path,{...options,credentials:'same-origin',headers:options.body instanceof FormData?{}:{'Content-Type':'application/json'}});
    const result=await response.json();if(!response.ok)throw Error(result.error||'操作失败');return result;
  }
  function sync(){if(!source)form.elements.body.value=converter.turndown(rich.innerHTML);}
  function changed(){sync();dirty=true;$('draft-state').textContent='有未保存修改';}
  function remember(){const selected=window.getSelection();if(selected.rangeCount&&rich.contains(selected.anchorNode))bookmark=selected.getRangeAt(0).cloneRange();}
  function restore(){rich.focus();const selected=window.getSelection();if(bookmark&&rich.contains(bookmark.commonAncestorContainer)){selected.removeAllRanges();selected.addRange(bookmark);}}
  async function work(action){
    if(busy)return;busy=true;
    document.querySelectorAll('button,#editor input,#editor textarea').forEach(b=>b.disabled=true);rich.contentEditable='false';
    try{await action();}catch(e){status(e.message);}finally{busy=false;document.querySelectorAll('button,#editor input,#editor textarea').forEach(b=>b.disabled=false);rich.contentEditable='true';}
  }
  function values(){sync();if(!form.elements.slug.value)form.elements.slug.value='post-'+Date.now().toString(36)+'-'+crypto.randomUUID().slice(0,8);
    return {slug:form.elements.slug.value.trim(),title:form.elements.title.value.trim(),summary:form.elements.summary.value.trim()||(source?form.elements.body.value:rich.textContent).slice(0,140),tags:form.elements.tags.value.split(/[,，]/).map(t=>t.trim()).filter(Boolean),body:form.elements.body.value,version};}
  async function renderVisual(){const result=await api('/api/writing/preview',{method:'POST',body:JSON.stringify({body:form.elements.body.value})});rich.innerHTML=clean(result.html);bookmark=null;}
  async function list(){
    const posts=(await api('/api/writing/posts')).posts;$('posts').replaceChildren();
    if(!posts.length)$('posts').textContent='还没有文章，写下第一篇吧。';
    for(const post of posts){
      const button=document.createElement('button');button.textContent=post.title;
      const small=document.createElement('small');small.textContent=post.review_state==='pending'?'待审核':post.review_state==='rejected'?'需修改':post.published_at?(post.version===post.published_version?'已发布':'有未发布修改'):'草稿';button.append(small);
      button.onclick=()=>{if(dirty&&!confirm('当前修改尚未保存，确定切换文章？'))return;work(async()=>{
        for(const key of ['title','slug','summary','body'])form.elements[key].value=post[key];form.elements.tags.value=post.tags.join(', ');
        form.elements.slug.readOnly=true;version=post.version;dirty=false;await renderVisual();
        $('draft-state').textContent=small.textContent+' · '+new Date(post.updated_at).toLocaleString();$('unpublish').hidden=!me.admin||!post.published_at;$('preview-content').hidden=true;
        status(post.review_note||'');
      });};$('posts').append(button);
    }
  }
  async function save(){const data=values();if(!data.title||!data.body.trim())throw Error('请填写标题和正文');if(data.body.length>60000)throw Error('正文过长，请分成多篇文章');
    const result=await api('/api/writing/posts',{method:'POST',body:JSON.stringify(data)});version=result.version;form.elements.slug.value=result.slug;form.elements.slug.readOnly=true;dirty=false;
    $('draft-state').textContent='草稿已保存 · '+new Date().toLocaleTimeString();await list();
  }
  form.oninput=changed;rich.addEventListener('input',changed);rich.addEventListener('keyup',remember);rich.addEventListener('mouseup',remember);rich.addEventListener('blur',remember);
  document.querySelector('.editor-toolbar').onmousedown=e=>{if(e.target.closest('button'))e.preventDefault();};
  document.querySelector('.editor-toolbar').onclick=e=>{
    const button=e.target.closest('button');if(!button||busy)return;
    if(button.id==='source-mode'){work(async()=>{if(!source){sync();source=true;}else{await renderVisual();source=false;}rich.hidden=source;form.elements.body.hidden=!source;button.textContent=source?'返回可视编辑':'Markdown 源码';document.querySelectorAll('[data-format],[data-block],#insert-link').forEach(b=>b.hidden=source);});return;}
    if(source)return;restore();
    if(button.dataset.format)document.execCommand(button.dataset.format,false,null);
    if(button.dataset.block)document.execCommand('formatBlock',false,button.dataset.block);
    if(button.id==='insert-link'){
      const value=prompt('输入链接地址，例如 https://example.com');if(!value)return;
      try{const url=new URL(value);if(!['https:','http:','mailto:'].includes(url.protocol))throw Error();if(window.getSelection().isCollapsed){const link=document.createElement('a');link.href=url.href;link.textContent=url.href;document.execCommand('insertHTML',false,link.outerHTML);}else document.execCommand('createLink',false,url.href);}catch{status('请输入有效的网页或邮件链接');return;}
    }
    changed();remember();
  };
  form.onsubmit=e=>{e.preventDefault();work(async()=>{await save();status('草稿已保存');});};
  $('new').onclick=()=>{if(dirty&&!confirm('当前修改尚未保存，确定新建文章？'))return;form.reset();rich.replaceChildren();bookmark=null;version=0;dirty=false;form.elements.slug.readOnly=false;$('unpublish').hidden=true;$('preview-content').hidden=true;$('draft-state').textContent='尚未保存';status('');form.elements.title.focus();};
  $('publish').onclick=()=>work(async()=>{await save();const data=values();const path=me.admin?'/api/admin/posts/'+data.slug+'/publish':'/api/writing/posts/'+data.slug+'/submit';const result=await api(path,{method:'POST',body:JSON.stringify({version})});status(result.message);$('unpublish').hidden=!me.admin;await list();});
  $('unpublish').onclick=()=>work(async()=>{if(!confirm('确定下线文章？草稿会保留。'))return;const result=await api('/api/admin/posts/'+values().slug+'/unpublish',{method:'POST',body:'{}'});status(result.message);$('unpublish').hidden=true;await list();});
  $('export').onclick=()=>{const post=values(),link=document.createElement('a');link.href=URL.createObjectURL(new Blob([`# ${post.title}\n\n${post.body}\n`],{type:'text/markdown;charset=utf-8'}));link.download=(post.slug||'draft')+'.md';link.click();URL.revokeObjectURL(link.href);};
  $('preview').onclick=()=>work(async()=>{const result=await api('/api/writing/preview',{method:'POST',body:JSON.stringify({body:values().body})});$('preview-content').innerHTML=clean(result.html);$('preview-content').hidden=false;});
  async function upload(file){
    if(!file)return;
    const position=[form.elements.body.selectionStart,form.elements.body.selectionEnd];
    await work(async()=>{status('正在准备图片…');
      if(file.size>1024*1024){
        if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>20*1024*1024)throw Error('GIF 最大 1 MB，其他图片请使用 20 MB 以内的 PNG/JPEG/WebP');
        const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas');
        try{
          let scale=Math.min(1,1920/Math.max(bitmap.width,bitmap.height)),blob;
          for(let pass=0;pass<3;pass++){
            canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
            for(const quality of [.85,.65,.45]){blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(blob&&blob.size<=1024*1024)break;}
            if(blob&&blob.size<=1024*1024)break;scale*=.7;
          }
          if(!blob||blob.size>1024*1024)throw Error('图片压缩后仍过大，请选择更小的图片');
          file=new File([blob],file.name.replace(/\.[^.]+$/,'')+'.webp',{type:blob.type});
        }finally{bitmap.close();}
      }
      status('正在上传图片…');const data=new FormData();data.append('image',file);
      const result=await api('/api/writing/images',{method:'POST',body:data});
      const alt=(file.name||'图片').replace(/\.[^.]+$/,'').replace(/[\[\]\\\r\n]/g,' ').slice(0,100)||'图片';
      if(source)form.elements.body.setRangeText(`\n\n![${alt}](${result.url})\n\n`,position[0],position[1],'end');
      else{restore();const image=document.createElement('img');image.src=result.url;image.alt=alt;const selected=window.getSelection();if(selected.rangeCount&&rich.contains(selected.anchorNode)){const range=selected.getRangeAt(0);range.deleteContents();range.insertNode(image);range.setStartAfter(image);range.collapse(true);selected.removeAllRanges();selected.addRange(range);}else rich.append(image);remember();}
      changed();status('图片已插入。保存草稿后，发布或提交审核即可。');
    });
  }
  $('upload-image').onclick=()=>{remember();$('image-file').click();};$('image-file').onchange=()=>upload($('image-file').files[0]).finally(()=>{$('image-file').value='';});
  rich.addEventListener('paste',e=>{e.preventDefault();if(busy)return;const files=[...e.clipboardData.files];if(files.length){remember();upload(files[0]);return;}
    const html=e.clipboardData.getData('text/html');if(html)document.execCommand('insertHTML',false,clean(html));else document.execCommand('insertText',false,e.clipboardData.getData('text/plain'));changed();remember();});
  rich.addEventListener('drop',e=>{e.preventDefault();if(!busy&&e.dataTransfer.files.length){remember();upload(e.dataTransfer.files[0]);}});
  function tab(name){$('writing').hidden=name!=='writing';$('moderation').hidden=name!=='comments';$('submissions').hidden=name!=='submissions';for(const key of ['writing','comments','submissions'])$(key+'-tab').setAttribute('aria-selected',String(name===key));}
  $('writing-tab').onclick=()=>tab('writing');$('comments-tab').onclick=()=>{tab('comments');work(loadComments);};$('submissions-tab').onclick=()=>{tab('submissions');work(loadSubmissions);};
  $('refresh-comments').onclick=()=>work(loadComments);$('refresh-submissions').onclick=()=>work(loadSubmissions);
  async function loadSubmissions(){const posts=(await api('/api/admin/submissions')).posts;$('submission-list').replaceChildren();if(!posts.length)$('submission-list').textContent='暂无待审核投稿。';
    for(const post of posts){const card=document.createElement('article');card.className='panel review-post';const title=document.createElement('h2');title.textContent=post.title;
      const meta=document.createElement('p');meta.className='review-meta';meta.textContent=`${post.login} · ${{pending:'待审核',rejected:'已退回',draft:'有未提交修改',approved:'已通过'}[post.review_state]} · 版本 ${post.version}`;
      const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent='展开查看全文';const content=document.createElement('article');content.className='prose review-body';detail.append(summary,content);detail.ontoggle=()=>{if(detail.open&&!content.dataset.loaded)work(async()=>{const result=await api('/api/admin/preview',{method:'POST',body:JSON.stringify({body:post.body})});content.innerHTML=clean(result.html);content.dataset.loaded='true';});};card.append(title,meta,detail);
      for(const [label,action]of[['审核通过并发布','publish'],['退回修改','reject'],['下线已发布版本','unpublish']]){if(action!=='unpublish'&&post.review_state!=='pending'||action==='unpublish'&&!post.published_at)continue;
        const button=document.createElement('button');button.textContent=label;button.onclick=()=>work(async()=>{const note=action==='reject'?prompt('给作者的修改建议','请修改后重新提交'):'';if(action==='reject'&&note===null)return;if(action!=='reject'&&!confirm(action==='publish'?'确认已审阅全文并公开这篇投稿？':'确定下线此投稿？'))return;
          const result=await api('/api/admin/posts/'+post.slug+'/'+action,{method:'POST',body:JSON.stringify({version:post.version,note})});status(result.message||'投稿已退回');await loadSubmissions();});card.append(button);}
      $('submission-list').append(card);
    }
  }
  async function loadComments(){const rows=(await api('/api/admin/comments')).comments;$('comments').replaceChildren();if(!rows.length)$('comments').textContent='暂无留言。';
    for(const c of rows){const card=document.createElement('article');card.className='comment';const meta=document.createElement('small');meta.textContent=`${c.login} · ${c.thread} · ${{pending:'待审核',approved:'已公开',rejected:'已隐藏'}[c.status]}`;const p=document.createElement('p');p.textContent=c.body;card.append(meta,p);
      for(const [label,method,state]of[['通过','PATCH','approved'],['隐藏','PATCH','rejected'],['删除','DELETE',null]]){const button=document.createElement('button');button.textContent=label;button.onclick=()=>work(async()=>{if(method==='DELETE'&&!confirm('永久删除此留言？'))return;await api('/api/admin/comments/'+c.id,{method,body:JSON.stringify({status:state})});await loadComments();status('留言已处理');});card.append(button);}
      const reply=document.createElement('button');reply.textContent='回复';reply.onclick=()=>work(async()=>{const message=prompt('回复 '+c.login+'（公开回复）');if(!message?.trim())return;await api('/api/comments',{method:'POST',body:JSON.stringify({thread:c.thread,body:'@'+c.login+' '+message})});await loadComments();status('回复已公开');});card.append(reply);$('comments').append(card);}
  }
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  api('/api/me').then(async({user})=>{me=user;$('identity').textContent=user?user.login:'尚未登录';if(!user)return;
    const logout=document.createElement('button');logout.textContent='退出';logout.onclick=()=>work(async()=>{if(dirty&&!confirm('有未保存修改，确定退出？'))return;await api('/api/logout',{method:'POST',body:'{}'});dirty=false;location.reload();});$('identity').append(' ',logout);
    $('welcome').hidden=true;$('workspace').hidden=false;$('comments-tab').hidden=!user.admin;$('submissions-tab').hidden=!user.admin;
    $('role-note').textContent=user.admin?'站长模式：文章可直接发布；访客投稿和留言由你审核。':'访客投稿：只能编辑自己的草稿。审核通过后仅展示在访客投稿页，默认折叠，不进入站长博客或推荐。';
    $('publish').textContent=user.admin?'发布到博客':'提交审核';await list();
  }).catch(e=>status(e.message));
})();
