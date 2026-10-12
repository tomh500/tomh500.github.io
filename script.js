(() => {
  'use strict';

  const copy = {
    zh: {
      skip: '跳到正文', mainNav: '主导航', homeLink: 'tomh500 首页', mobileNav: '移动端导航', navHome: '首页', navAbout: '关于我', navProjects: '项目', navSocial: '社交',
      languageToggle: '切换为英语', menuToggle: '打开导航', menuClose: '关闭导航', greeting: '你好，我是', name: '三月小芹菜',
      alias: '也可以叫我 tomh500', quote: '未来从不是注定的，它诞生于每一次选择。', identity: '我在做的事',
      identityTools: 'Windows 实用工具开发', identityGames: '游戏工具与自动化', identityOpen: '在 GitHub 分享自己的作品',
      latest: '最新作品 · ScreenShotPlus', badgeNew: '新', badgeLegacy: '已归档', latestShort: '截取、标注，然后分享。',
      song: '时间日记', artist: '洛天依', play: '播放音乐', pause: '暂停音乐', musicError: '音乐暂时无法播放，请稍后再试。',
      aboutTitle: '代码之外，也是我。', aboutIntro: '一些作品，一些喜欢的事物，和一个属于自己的小角落。',
      aboutBody: '这里收集了我的工具与项目。从 Windows 实用软件到游戏工具，再到音乐自动化，做出来的东西都可以在项目页找到。',
      viewGitHub: '在 GitHub 看看', interestsTitle: '我喜欢的世界', interestsIntro: '写代码以外，把时间留给这些。',
      minecraft: '方块人十年老兵', gbc: '井芹仁菜', vocaloid: '洛天依，以及喜欢的歌', visualNovel: '视觉小说', galgame: '旮旯给木', refreshQuote: '换一句',
      projectsTitle: '把想法，做成作品。', projectsIntro: '桌面工具、游戏体验与音乐。这里是我的作品集合。',
      filterLabel: '项目分类', filterAll: '全部', filterDesktop: '桌面工具', filterGames: '游戏', filterMusic: '音乐',
      searchLabel: '搜索项目', searchPlaceholder: '搜索项目…', emptyTitle: '没有找到这个项目', emptyText: '试试另一个关键词，或查看全部作品。',
      resetSearch: '查看全部', resultCount: '显示 {count} / {total} 个项目', download: '获取下载', visit: '访问项目',
      downloadEyebrow: '获取软件', closeModal: '关闭下载窗口', downloadDescription: '选择下载来源，或前往项目页面了解更多。',
      password: '提取码', copyPassword: '复制提取码', copied: '提取码已复制。', copyFailed: '请手动复制上方提取码。',
      socialTitle: '在别处，也能找到我。', socialIntro: '代码、视频和交流。选一个你熟悉的地方。', githubDesc: '项目源码与开发记录',
      bilibiliDesc: '视频与动态', discordDesc: '加入社区，一起聊聊', joinCommunity: '进入社区', socialNote: '项目问题也可以在对应仓库提交 Issue。',
      footer: '留下想法，也留下作品。', themeDark: '切换至深色主题', themeLight: '切换至浅色主题', imageAlt: '{name} 项目封面'
    },
    en: {
      skip: 'Skip to content', mainNav: 'Main navigation', homeLink: 'tomh500 Home', mobileNav: 'Mobile navigation', navHome: 'Home', navAbout: 'About', navProjects: 'Projects', navSocial: 'Social',
      languageToggle: 'Switch to Chinese', menuToggle: 'Open navigation', menuClose: 'Close navigation', greeting: "Hello, I'm", name: '三月小芹菜',
      alias: 'You can also call me tomh500', quote: 'The future is shaped by every choice we make.', identity: 'What I do',
      identityTools: 'Build useful Windows tools', identityGames: 'Explore game tools & automation', identityOpen: 'Share my work on GitHub',
      latest: 'Latest project · ScreenShotPlus', badgeNew: 'NEW', badgeLegacy: 'ARCHIVED', latestShort: 'Capture, annotate, then share.',
      song: '时间日记', artist: 'Luo Tianyi', play: 'Play music', pause: 'Pause music', musicError: 'Music could not be played. Please try again later.',
      aboutTitle: 'A little beyond the code.', aboutIntro: 'Things I make, things I enjoy, and a small corner of my own.',
      aboutBody: 'This is a collection of my tools and projects. From Windows utilities to game tools and music automation, you can explore what I make on the projects page.',
      viewGitHub: 'Explore my GitHub', interestsTitle: 'Worlds I enjoy', interestsIntro: 'A few things I spend time with, beyond coding.',
      minecraft: 'A decade in a world of blocks', gbc: 'Nina Iseri', vocaloid: 'Luo Tianyi and the songs I love', visualNovel: 'Visual novels', galgame: 'Galgames', refreshQuote: 'Another thought',
      projectsTitle: 'Ideas, made real.', projectsIntro: 'Desktop tools, game experiences, and music. A collection of my work.',
      filterLabel: 'Project categories', filterAll: 'All', filterDesktop: 'Desktop tools', filterGames: 'Games', filterMusic: 'Music',
      searchLabel: 'Search projects', searchPlaceholder: 'Search projects…', emptyTitle: 'No matching projects', emptyText: 'Try a different keyword, or explore the full collection.',
      resetSearch: 'Show all projects', resultCount: 'Showing {count} of {total} projects', download: 'Get the app', visit: 'View project',
      downloadEyebrow: 'GET THE APP', closeModal: 'Close download dialog', downloadDescription: 'Choose a download source or visit the project page to learn more.',
      password: 'Access code', copyPassword: 'Copy access code', copied: 'Access code copied.', copyFailed: 'Please copy the access code above manually.',
      socialTitle: 'Find me elsewhere.', socialIntro: 'Code, videos, and conversations. Choose a place that feels familiar.', githubDesc: 'Source code & development',
      bilibiliDesc: 'Videos & updates', discordDesc: 'Join the community and say hello', joinCommunity: 'Join the community', socialNote: 'For project questions, you can also open an issue in the relevant repository.',
      footer: 'A home for ideas and the things I make.', themeDark: 'Switch to dark theme', themeLight: 'Switch to light theme', imageAlt: '{name} project cover'
    }
  };

  function readPreference(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
  }
  function savePreference(key, value) {
    try { localStorage.setItem(key, value); } catch { /* Preferences are optional. */ }
  }
  let language = readPreference('celery-language', 'zh') === 'en' ? 'en' : 'zh';
  let category = 'all';
  let quoteIndex = 0;
  let activeProject = null;
  let currentRoute = null;
  const config = window.SITE_CONFIG;
  const grid = document.getElementById('project-grid');
  const search = document.getElementById('project-search');
  const modal = document.getElementById('download-modal');
  const menu = document.getElementById('mobile-nav');
  const menuButton = document.getElementById('menu-toggle');
  const audio = document.getElementById('bgm');
  const playButton = document.getElementById('play-btn');
  const t = key => copy[language][key] || key;
  const localized = value => typeof value === 'string' ? value : (value?.[language] || value?.zh || '');

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function icon(name) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    node.setAttribute('class', 'icon');
    node.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-' + name);
    node.append(use);
    return node;
  }
  function externalLink(url, className) {
    const link = element('a', className);
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }

  function renderProjects() {
    const keyword = search.value.toLocaleLowerCase().trim();
    const projects = config.projects.filter(project => {
      const searchable = [project.name, project.description.zh, project.description.en, project.category].join(' ').toLocaleLowerCase();
      return (category === 'all' || project.category === category) && searchable.includes(keyword);
    });
    grid.replaceChildren();
    projects.forEach(project => {
      const card = element('article', 'project-card');
      card.dataset.project = project.id;
      const cover = element('div', 'project-cover' + (project.id === 'screenshotplus' ? ' screenshotplus' : ''));
      const image = element('img');
      image.src = project.image;
      image.alt = t('imageAlt').replace('{name}', project.name);
      image.loading = 'lazy';
      image.decoding = 'async';
      cover.append(image);
      if (project.label) cover.append(element('span', project.label === 'new' ? 'new-badge' : 'legacy-badge', t(project.label === 'new' ? 'badgeNew' : 'badgeLegacy')));
      const body = element('div', 'project-body');
      const categoryKey = { desktop: 'filterDesktop', games: 'filterGames', music: 'filterMusic' }[project.category];
      body.append(element('span', 'project-category', t(categoryKey)), element('h2', '', project.name), element('p', '', localized(project.description)));
      const action = project.routes ? element('button', 'project-action') : externalLink(project.url, 'project-action');
      if (project.routes) {
        action.type = 'button';
        action.setAttribute('aria-haspopup', 'dialog');
        action.addEventListener('click', () => openDownload(project));
      }
      action.setAttribute('aria-label', `${project.name} · ${t(project.routes ? 'download' : 'visit')}`);
      action.append(element('span', '', t(project.routes ? 'download' : 'visit')), icon(project.routes ? 'download' : 'external'));
      body.append(action);
      card.append(cover, body);
      grid.append(card);
    });
    document.getElementById('empty-state').hidden = projects.length > 0;
    document.getElementById('result-count').textContent = t('resultCount').replace('{count}', projects.length).replace('{total}', config.projects.length);
    document.querySelectorAll('[data-filter]').forEach(button => {
      const selected = button.dataset.filter === category;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function renderDownload(project) {
    document.getElementById('download-title').textContent = project.name;
    document.getElementById('download-description').textContent = project.note ? localized(project.note) : t('downloadDescription');
    document.getElementById('download-notice').textContent = '';
    const routes = document.getElementById('route-container');
    routes.replaceChildren();
    project.routes.forEach(route => {
      const link = externalLink(route.url, 'route-item');
      const label = element('span', '', localized(route.name));
      if (route.password) label.append(element('small', '', `${t('password')}: ${route.password}`));
      link.append(label, icon('external'));
      routes.append(link);
      if (route.password) {
        const copyButton = element('button', 'text-link copy-password', t('copyPassword'));
        copyButton.type = 'button';
        copyButton.style.marginTop = '12px';
        copyButton.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(route.password);
            document.getElementById('download-notice').textContent = t('copied');
          } catch {
            document.getElementById('download-notice').textContent = t('copyFailed');
          }
        });
        routes.append(copyButton);
      }
    });
  }
  function openDownload(project) {
    activeProject = project;
    renderDownload(project);
    modal.showModal();
  }
  document.getElementById('close-modal').addEventListener('click', () => modal.close());
  modal.addEventListener('click', event => {
    if (event.target !== modal) return;
    const bounds = modal.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) modal.close();
  });
  modal.addEventListener('close', () => { activeProject = null; });

  function updateThemeButton() {
    const dark = document.documentElement.dataset.theme === 'dark';
    document.getElementById('theme-toggle').setAttribute('aria-label', t(dark ? 'themeLight' : 'themeDark'));
    document.getElementById('theme-icon').setAttribute('href', dark ? '#i-sun' : '#i-moon');
    document.querySelector('meta[name="theme-color"]').content = dark ? '#112a3e' : '#f2faff';
  }
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    savePreference('celery-theme', theme);
    updateThemeButton();
  });

  function setMenu(open) {
    menu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', t(open ? 'menuClose' : 'menuToggle'));
    menuButton.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
  }
  menuButton.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) { setMenu(false); menuButton.focus(); }
  });
  window.matchMedia('(min-width:681px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

  function updateTitle() {
    const labels = { home: 'navHome', about: 'navAbout', projects: 'navProjects', social: 'navSocial' };
    document.title = `${currentRoute && currentRoute !== 'home' ? t(labels[currentRoute]) + ' · ' : ''}${t('name')} | tomh500`;
  }
  function route(initial = false) {
    if (location.hash === '#main') {
      document.getElementById('main').focus({ preventScroll: true });
      return;
    }
    const requested = location.hash.slice(1) || 'home';
    const page = ['home', 'about', 'projects', 'social'].includes(requested) ? requested : 'home';
    document.querySelectorAll('.page').forEach(section => { section.hidden = section.id !== page; });
    document.querySelectorAll('[data-route]').forEach(link => {
      if (link.dataset.route === page) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (modal.open) modal.close();
    setMenu(false);
    if (!initial && page !== currentRoute) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      const heading = document.getElementById(page).querySelector('h1');
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    currentRoute = page;
    updateTitle();
  }
  window.addEventListener('hashchange', () => route());
  document.querySelectorAll('a[href="#home"],a[href="#about"],a[href="#projects"],a[href="#social"]').forEach(link => {
    link.addEventListener('click', () => { if (link.hash === location.hash) setMenu(false); });
  });

  function updateAudioButton() {
    const playing = !audio.paused;
    playButton.setAttribute('aria-label', t(playing ? 'pause' : 'play'));
    playButton.setAttribute('aria-pressed', String(playing));
    document.getElementById('play-icon').setAttribute('href', playing ? '#i-pause' : '#i-play');
  }
  audio.volume = 0.25;
  playButton.addEventListener('click', async () => {
    document.getElementById('music-status').textContent = '';
    if (!audio.paused) { audio.pause(); return; }
    playButton.disabled = true;
    try { await audio.play(); }
    catch { document.getElementById('music-status').textContent = t('musicError'); }
    finally { playButton.disabled = false; updateAudioButton(); }
  });
  audio.addEventListener('play', updateAudioButton);
  audio.addEventListener('pause', updateAudioButton);
  audio.addEventListener('error', () => {
    document.getElementById('music-status').textContent = t('musicError');
    updateAudioButton();
  });

  function renderQuote() {
    document.getElementById('random-quote').textContent = localized(config.quotes[quoteIndex]);
  }
  document.getElementById('refresh-quote').addEventListener('click', () => {
    quoteIndex = (quoteIndex + 1) % config.quotes.length;
    renderQuote();
  });
  function applyLanguage() {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach(node => { node.setAttribute('aria-label', t(node.dataset.i18nAria)); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(node => { node.placeholder = t(node.dataset.i18nPlaceholder); });
    document.getElementById('language-label').textContent = language === 'zh' ? 'EN' : '中';
    renderProjects();
    renderQuote();
    updateThemeButton();
    updateAudioButton();
    updateTitle();
    setMenu(!menu.hidden);
    if (activeProject) renderDownload(activeProject);
  }
  document.getElementById('language-toggle').addEventListener('click', () => {
    language = language === 'zh' ? 'en' : 'zh';
    savePreference('celery-language', language);
    applyLanguage();
  });
  search.addEventListener('input', renderProjects);
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    category = button.dataset.filter;
    renderProjects();
  }));
  document.getElementById('reset-search').addEventListener('click', () => {
    category = 'all'; search.value = ''; renderProjects(); search.focus();
  });
  applyLanguage();
  route(true);
})();
