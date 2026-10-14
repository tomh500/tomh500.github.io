/* Static adapter for the downloaded kldhsh.top HTML template. */
(() => {
  'use strict';
  const read = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  let language = read('celery-language', 'zh') === 'en' ? 'en' : 'zh';
  const localized = value => typeof value === 'string' ? value : value?.[language] || value?.zh || '';
  const text = (zh, en) => language === 'en' ? en : zh;
  const menu = document.getElementById('mobile-nav');
  const dialog = document.getElementById('download-dialog');
  const projects = JSON.parse(document.getElementById('project-data')?.textContent || '[]');
  let activeProject = null;
  function applyLanguage() {
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    document.querySelectorAll('[data-zh]').forEach(node => { node.textContent = node.dataset[language]; });
    document.querySelectorAll('[data-action="language"]').forEach(button => { button.title = text('切换为英语', 'Switch to Chinese'); button.setAttribute('aria-label', button.title); });
    document.querySelectorAll('[data-action="theme"]').forEach(button => button.setAttribute('aria-label', text('切换主题', 'Toggle theme')));
    document.querySelectorAll('[data-action="menu"]').forEach(button => button.setAttribute('aria-label', text('打开导航', 'Open navigation')));
    updateMusic();
    if (dialog?.open && activeProject) renderDownload(activeProject);
  }
  function closeMenu() {
    if (menu) menu.hidden = true;
    document.querySelectorAll('[data-action="menu"]').forEach(button => button.setAttribute('aria-expanded', 'false'));
  }
  document.querySelectorAll('[data-action="language"]').forEach(button => button.addEventListener('click', () => {
    language = language === 'zh' ? 'en' : 'zh'; save('celery-language', language); applyLanguage();
  }));
  document.querySelectorAll('[data-action="theme"]').forEach(button => button.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark'); save('celery-theme', dark ? 'dark' : 'light');
  }));
  document.querySelectorAll('[data-action="menu"]').forEach(button => button.addEventListener('click', () => {
    menu.hidden = !menu.hidden; button.setAttribute('aria-expanded', String(!menu.hidden));
  }));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  matchMedia('(min-width: 768px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
  document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach(item => {
      const active = item.dataset.tab === button.dataset.tab;
      item.setAttribute('aria-pressed', String(active)); item.className = active ? item.dataset.activeClass : item.dataset.inactiveClass;
    });
    document.querySelectorAll('[data-tab-panel]').forEach(panel => { panel.hidden = panel.dataset.tabPanel !== button.dataset.tab; });
  }));
  const audio = document.querySelector('audio');
  const musicButton = document.querySelector('[data-action="music"]');
  function updateMusic() {
    if (!musicButton) return;
    musicButton.textContent = audio.paused ? text('播放', 'Play') : text('暂停', 'Pause');
    musicButton.setAttribute('aria-label', audio.paused ? text('播放音乐', 'Play music') : text('暂停音乐', 'Pause music'));
  }
  musicButton?.addEventListener('click', async () => {
    const status = musicButton.parentElement.querySelector('[role="status"]'); status.textContent = '';
    try { if (audio.paused) await audio.play(); else audio.pause(); }
    catch { status.textContent = text('音乐暂时无法播放，请稍后再试。', 'Music could not be played. Please try again later.'); }
    updateMusic();
  });
  audio?.addEventListener('play', updateMusic); audio?.addEventListener('pause', updateMusic);
  function renderDownload(project) {
    document.getElementById('download-title').textContent = project.name;
    document.getElementById('download-note').textContent = localized(project.note || project.description);
    const routes = document.getElementById('download-routes'); routes.replaceChildren();
    document.getElementById('download-status').textContent = '';
    for (const route of project.routes) {
      const row = document.createElement('div'); row.className = 'download-route';
      const link = document.createElement('a'); link.href = route.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = localized(route.name); row.append(link);
      if (route.password) {
        const code = document.createElement('code'); code.textContent = route.password;
        const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = text('复制提取码', 'Copy access code');
        copy.addEventListener('click', async () => {
          const status = document.getElementById('download-status');
          try { await navigator.clipboard.writeText(route.password); status.textContent = text('提取码已复制。', 'Access code copied.'); }
          catch { status.textContent = text('请手动复制提取码：', 'Please copy the access code manually: ') + route.password; }
        }); row.append(code, copy);
      } routes.append(row);
    }
  }
  document.querySelectorAll('[data-download]').forEach(button => button.addEventListener('click', () => {
    activeProject = projects.find(project => project.id === button.dataset.download);
    if (activeProject) { renderDownload(activeProject); dialog.showModal(); }
  }));
  document.querySelector('[data-action="close-dialog"]')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  const legacyRoute = location.hash.slice(1);
  if (document.body.dataset.page === 'home' && ['about', 'projects', 'social'].includes(legacyRoute)) location.replace('/' + legacyRoute + '/');
  applyLanguage();
})();
