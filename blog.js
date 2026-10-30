/* Public blog UI. Articles are static; only identity and comments use the backend. */
(() => {
  'use strict';
  const config = JSON.parse(document.getElementById('site-data').textContent).blog || {};
  const apiOrigin = config.apiOrigin;
  const english = () => document.documentElement.lang === 'en';
  const tr = (zh,en) => english() ? en : zh;
  let generation=0, activeWidget=null, challengeLoading=null;
  async function api(path, options={}) {
    const response = await fetch(apiOrigin+path,{...options,credentials:'include',headers:{'Content-Type':'application/json'}});
    const data = await response.json();
    if(!response.ok) throw Error(data.error || tr('请求失败，请重试','Request failed. Please try again.'));
    return data;
  }
  function loginLink(){
    const a=document.createElement('a');a.className='blog-button';a.textContent=tr('使用 GitHub 登录后留言','Sign in with GitHub to comment');
    a.href=apiOrigin+'/auth/login?returnTo='+encodeURIComponent(location.href);return a;
  }
  async function initialize(){
    const run=++generation;
    if(activeWidget!==null && window.turnstile){window.turnstile.remove(activeWidget);activeWidget=null;}
    const search=document.getElementById('blog-search');
    if(search)search.oninput=()=>{
      const query=search.value.trim().toLowerCase();let visible=0;
      document.querySelectorAll('.blog-post').forEach(card=>{card.hidden=!card.dataset.search.includes(query);if(!card.hidden)visible++;});
      document.getElementById('blog-empty').hidden=visible>0;
    };
    document.querySelectorAll('[data-admin-link]').forEach(link=>{if(apiOrigin){link.href=apiOrigin+'/admin/';link.hidden=false;}});
    const section=document.querySelector('[data-comments]');if(!section)return;
    const status=section.querySelector('.comment-status'), account=section.querySelector('.comment-account'), form=section.querySelector('form'), list=section.querySelector('.comment-list'), more=section.querySelector('.comment-more');
    if(!apiOrigin){status.textContent=tr('留言功能准备中，文章阅读不受影响。','Comments are being prepared. You can still read all posts.');return;}
    const thread=section.dataset.thread;let before=0,beforeId='',widget=null;
    function showComments(rows,append){
      if(!append)list.replaceChildren();
      for(const c of rows){
        const card=document.createElement('article');card.className='comment-card';
        const meta=document.createElement('div');meta.className='comment-meta';
        const avatar=document.createElement('img');avatar.src=c.avatar;avatar.alt='';avatar.loading='lazy';avatar.width=32;avatar.height=32;
        const name=document.createElement('strong');name.textContent=c.login;
        const time=document.createElement('time');time.dateTime=new Date(c.created*1000).toISOString();time.textContent=new Date(c.created*1000).toLocaleDateString(english()?'en':'zh-CN');
        const p=document.createElement('p');p.textContent=c.body;meta.append(avatar,name,time);card.append(meta,p);list.append(card);
      }
      if(rows.length){before=rows[rows.length-1].created;beforeId=rows[rows.length-1].id;}
      more.hidden=rows.length<50;
      if(!list.children.length)list.textContent=tr('还没有留言，来留下第一句话吧。','No messages yet. Be the first to leave a note.');
    }
    async function load(append=false){const data=await api('/api/comments?thread='+encodeURIComponent(thread)+(append?'&before='+before+'&beforeId='+encodeURIComponent(beforeId):''));if(run===generation)showComments(data.comments,append);}
    more.onclick=()=>load(true).catch(e=>status.textContent=e.message);
    try{
      status.textContent=tr('正在加载留言…','Loading comments…');
      const [identity,settings]=await Promise.all([api('/api/me'),api('/api/config'),load()]);
      if(run!==generation)return;
      status.textContent='';account.replaceChildren();form.hidden=true;
      if(!identity.user){account.append(loginLink());return;}
      account.textContent=tr('当前登录：','Signed in as ')+identity.user.login+' ';
      const logout=document.createElement('button');logout.className='blog-button';logout.textContent=tr('退出','Sign out');logout.onclick=async()=>{try{await api('/api/logout',{method:'POST',body:'{}'});initialize();}catch(e){status.textContent=e.message;}};account.append(logout);form.hidden=false;
      if(settings.turnstileSiteKey){
        if(!window.turnstile){
          if(!challengeLoading)challengeLoading=new Promise((resolve,reject)=>{
            const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.onload=resolve;script.onerror=()=>{script.remove();challengeLoading=null;reject(Error(tr('验证组件加载失败，请刷新重试','Verification failed to load. Please refresh.')));};document.head.append(script);
          });
          await challengeLoading;
        }
        if(run!==generation)return;
        widget=window.turnstile.render(section.querySelector('.comment-challenge'),{sitekey:settings.turnstileSiteKey});activeWidget=widget;
      }
      form.onsubmit=async event=>{
        event.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;
        try{
          const result=await api('/api/comments',{method:'POST',body:JSON.stringify({thread,body:form.elements.body.value,turnstileToken:widget===null?'':window.turnstile.getResponse(widget)})});
          if(run!==generation)return;
          status.textContent=result.message;form.reset();await load();
        }catch(e){status.textContent=e.message;}finally{button.disabled=false;if(widget!==null)window.turnstile.reset(widget);}
      };
    }catch(e){if(run===generation)status.textContent=e.message;}
  }
  document.addEventListener('site:view',initialize);
  document.addEventListener('click',event=>{if(event.target.closest('[data-action="language"]'))initialize();});
  initialize();
})();
