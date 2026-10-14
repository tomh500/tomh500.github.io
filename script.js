/* Static interactions and partial navigation for the downloaded homepage template. */
(() => {
  'use strict';
  const read = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  let language = read('celery-language', 'zh') === 'en' ? 'en' : 'zh';
  const data = JSON.parse(document.getElementById('site-data').textContent);
  const projects = data.projects;
  const audio = document.getElementById('site-audio');
  const player = document.getElementById('music-player');
  const localized = value => typeof value === 'string' ? value : value?.[language] || value?.zh || '';
  const text = (zh, en) => language === 'en' ? en : zh;
  const filters = { query: '', category: 'all', tag: 'all' };
  let activeProject = null;
  let navigation = null;
  const cache = new Map();
  const paths = new Set(['/', '/about/', '/projects/', '/social/']);

  function canonicalPath(url) {
    let path = url.pathname.replace(/index\.html$/, '');
    if (!path.endsWith('/')) path += '/';
    return paths.has(path) ? path : null;
  }
  function closeMenu() {
    const menu = document.getElementById('mobile-nav');
    if (menu) menu.hidden = true;
    document.querySelectorAll('[data-action="menu"]').forEach(button => button.setAttribute('aria-expanded', 'false'));
  }
  function updateMusic() {
    const button = player.querySelector('[data-action="music"]');
    button.textContent = audio.paused ? text('播放', 'Play') : text('暂停', 'Pause');
    button.setAttribute('aria-label', audio.paused ? text('播放音乐', 'Play music') : text('暂停音乐', 'Pause music'));
    button.setAttribute('aria-pressed', String(!audio.paused));
  }
  function applyLanguage() {
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    document.querySelectorAll('[data-zh]').forEach(node => { node.textContent = node.dataset[language]; });
    document.querySelectorAll('[data-placeholder-zh]').forEach(node => { node.placeholder = node.dataset[language === 'zh' ? 'placeholderZh' : 'placeholderEn']; });
    document.querySelectorAll('[data-action="language"]').forEach(button => {
      button.title = text('切换为英语', 'Switch to Chinese'); button.setAttribute('aria-label', button.title);
    });
    document.querySelectorAll('[data-action="theme"]').forEach(button => button.setAttribute('aria-label', text('切换主题', 'Toggle theme')));
    document.querySelectorAll('[data-action="menu"]').forEach(button => button.setAttribute('aria-label', text('打开导航', 'Open navigation')));
    document.querySelector('[data-action="close-dialog"]')?.setAttribute('aria-label', text('关闭', 'Close'));
    updateMusic();
    filterProjects();
    renderRadar();
    if (document.getElementById('download-dialog')?.open && activeProject) renderDownload(activeProject);
  }

  function filterProjects() {
    const grid = document.getElementById('project-grid');
    if (!grid) return;
    const cards = [...grid.querySelectorAll('[data-project]')];
    const query = filters.query.trim().toLocaleLowerCase();
    let visible = 0;
    for (const card of cards) {
      const match = (!query || card.dataset.search.includes(query)) &&
        (filters.category === 'all' || card.dataset.category === filters.category) &&
        (filters.tag === 'all' || card.dataset.tags.split(' ').includes(filters.tag));
      card.hidden = !match;
      if (match) visible++;
    }
    document.getElementById('project-count').textContent = text(`显示 ${visible} / ${cards.length} 个项目`, `Showing ${visible} of ${cards.length} projects`);
    document.getElementById('project-empty').hidden = visible !== 0;
  }

  function svgElement(name, attributes = {}, content) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    if (content !== undefined) node.textContent = content;
    return node;
  }
  function renderRadar() {
    const container = document.querySelector('[data-radar]');
    if (!container) return;
    const skills = data.skills;
    const center = { x: 200, y: 174 }, radius = 106;
    const point = (index, ratio) => {
      const angle = -Math.PI / 2 + index * 2 * Math.PI / skills.length;
      return { x: center.x + Math.cos(angle) * radius * ratio, y: center.y + Math.sin(angle) * radius * ratio };
    };
    const points = ratio => skills.map((_, index) => { const p = point(index, ratio); return `${p.x},${p.y}`; }).join(' ');
    const svg = svgElement('svg', { viewBox: '0 0 400 350', role: 'img', 'aria-label': text('能力雷达图，主观评估', 'Ability radar chart, self-assessment') });
    svg.append(svgElement('title', {}, text('能力雷达图', 'Ability radar chart')));
    svg.append(svgElement('desc', {}, skills.map(skill => `${localized(skill.name)} ${skill.value}/100`).join('; ')));
    for (let step = 1; step <= 5; step++) svg.append(svgElement('polygon', { points: points(step / 5), class: 'radar-grid' }));
    skills.forEach((skill, index) => {
      const p = point(index, 1);
      svg.append(svgElement('line', { x1: center.x, y1: center.y, x2: p.x, y2: p.y, class: 'radar-axis' }));
      const label = point(index, 1.31);
      const anchor = label.x < center.x - 15 ? 'end' : label.x > center.x + 15 ? 'start' : 'middle';
      const node = svgElement('text', { x: label.x, y: label.y + 4, 'text-anchor': anchor, class: 'radar-label' });
      const lines = language === 'en' ? localized(skill.short).split(' ') : [localized(skill.short)];
      lines.forEach((line, lineIndex) => node.append(svgElement('tspan', { x: label.x, dy: lineIndex ? '15' : '0' }, line)));
      svg.append(node);
    });
    const values = skills.map((skill, index) => point(index, Math.max(0, Math.min(100, Number(skill.value))) / 100));
    svg.append(svgElement('polygon', { points: values.map(p => `${p.x},${p.y}`).join(' '), class: 'radar-values' }));
    skills.forEach((skill, index) => {
      const dot = svgElement('circle', { cx: values[index].x, cy: values[index].y, r: '4.5', fill: skill.color, class: 'radar-dot', 'data-skill-value': skill.value });
      dot.append(svgElement('title', {}, `${localized(skill.name)}: ${skill.value}/100`)); svg.append(dot);
    });
    container.replaceChildren(svg);
  }

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
      }
      routes.append(row);
    }
  }
  function initializeView() {
    const search = document.getElementById('project-search');
    if (search) {
      search.value = filters.query;
      document.getElementById('project-category').value = filters.category;
      document.getElementById('project-tag').value = filters.tag;
    }
    applyLanguage();
  }

  async function navigate(path, mode = 'push', hash = '') {
    if (!paths.has(path)) return;
    closeMenu();
    navigation?.abort();
    const controller = new AbortController(); navigation = controller;
    player.querySelector('[role="status"]').textContent = '';
    try {
      let source = cache.get(path);
      if (!source) {
        const response = await fetch(path, { signal: controller.signal });
        if (!response.ok) throw new Error('Page request failed');
        source = await response.text(); cache.set(path, source);
      }
      if (controller.signal.aborted) return;
      const next = new DOMParser().parseFromString(source, 'text/html');
      const main = next.querySelector('main'), nav = next.querySelector('body > nav');
      if (!main || !nav || !next.querySelector('#site-data')) throw new Error('Invalid page');
      // The audio element and player stay attached to the document throughout.
      document.querySelector('main').replaceWith(document.importNode(main, true));
      document.querySelector('body > nav').replaceWith(document.importNode(nav, true));
      document.getElementById('download-dialog')?.remove();
      const nextDialog = next.querySelector('#download-dialog');
      if (nextDialog) document.body.append(document.importNode(nextDialog, true));
      document.body.dataset.page = next.body.dataset.page;
      document.title = next.title;
      activeProject = null;
      if (mode === 'push') history.pushState({}, '', path + hash);
      else if (mode === 'replace') history.replaceState({}, '', path + hash);
      initializeView();
      const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
      if (target) target.scrollIntoView({ block: 'start', behavior: 'instant' });
      else window.scrollTo({ top: 0, behavior: 'instant' });
      document.querySelector('main').focus({ preventScroll: true });
    } catch (error) {
      if (error.name !== 'AbortError') player.querySelector('[role="status"]').textContent = text('页面加载失败，请重试。', 'Page could not be loaded. Please try again.');
    }
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (button?.dataset.action === 'language') {
      language = language === 'zh' ? 'en' : 'zh'; save('celery-language', language); applyLanguage();
    } else if (button?.dataset.action === 'theme') {
      const dark = document.documentElement.classList.toggle('dark'); save('celery-theme', dark ? 'dark' : 'light');
    } else if (button?.dataset.action === 'menu') {
      const menu = document.getElementById('mobile-nav'); menu.hidden = !menu.hidden; button.setAttribute('aria-expanded', String(!menu.hidden));
    } else if (button?.dataset.action === 'music') {
      player.querySelector('[role="status"]').textContent = '';
      try { if (audio.paused) await audio.play(); else audio.pause(); }
      catch { player.querySelector('[role="status"]').textContent = text('音乐暂时无法播放，请稍后再试。', 'Music could not be played. Please try again later.'); }
      updateMusic();
    } else if (button?.dataset.action === 'close-dialog') {
      document.getElementById('download-dialog').close();
    } else if (button?.dataset.action === 'reset-search') {
      Object.assign(filters, { query: '', category: 'all', tag: 'all' }); initializeView();
    } else if (button?.dataset.tab) {
      document.querySelectorAll('[data-tab]').forEach(item => {
        const active = item.dataset.tab === button.dataset.tab;
        item.setAttribute('aria-pressed', String(active)); item.className = active ? item.dataset.activeClass : item.dataset.inactiveClass;
      });
      document.querySelectorAll('[data-tab-panel]').forEach(panel => { panel.hidden = panel.dataset.tabPanel !== button.dataset.tab; });
    } else if (button?.dataset.download) {
      activeProject = projects.find(project => project.id === button.dataset.download);
      if (activeProject) { renderDownload(activeProject); document.getElementById('download-dialog').showModal(); }
    }
    const dialog = document.getElementById('download-dialog');
    if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    }
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target === '_blank' || link.hasAttribute('download')) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin) return;
    const path = canonicalPath(url);
    if (!path) return;
    event.preventDefault();
    if (path === canonicalPath(new URL(location.href))) {
      closeMenu();
      const target = url.hash ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
      if (target) { history.pushState({}, '', path + url.hash); target.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    } else await navigate(path, 'push', url.hash);
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'project-search') { filters.query = event.target.value; filterProjects(); }
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'project-category') filters.category = event.target.value;
    else if (event.target.id === 'project-tag') filters.tag = event.target.value;
    else return;
    filterProjects();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  matchMedia('(min-width: 768px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
  audio.addEventListener('play', updateMusic); audio.addEventListener('pause', updateMusic);
  window.addEventListener('popstate', () => {
    const path = canonicalPath(new URL(location.href));
    if (path) navigate(path, 'pop', location.hash);
  });
  cache.set(canonicalPath(new URL(location.href)), document.documentElement.outerHTML);
  initializeView();
  const legacyRoute = location.hash.slice(1);
  if (['about', 'projects', 'social'].includes(legacyRoute)) navigate('/' + legacyRoute + '/', 'replace');
})();
