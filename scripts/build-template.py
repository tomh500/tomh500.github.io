"""Replace content inside downloaded HTML; retain the upstream DOM and CSS classes."""
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Comment
from copy import deepcopy
import json
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
UPSTREAM = ROOT / 'template' / 'upstream'
CONTENT = json.loads((ROOT / 'site-content.json').read_text(encoding='utf-8'))
PROJECTS = json.loads(subprocess.check_output(['node', '-e', 'global.window={};require("./site-config.js");process.stdout.write(JSON.stringify(window.SITE_CONFIG.projects))'], cwd=ROOT).decode('utf-8'))
UI = {
    '首页': 'Home', '关于我': 'About me', '项目': 'Projects', '社交': 'Social', '博客': 'Blog',
    '你好，我是': "Hello, I'm", '我的身份': 'My identities', '当前学习方向': 'Currently learning',
    '常用技术': 'Technologies', '了解我': 'Get to know me', '我的性格': 'Personality',
    '我喜爱的': 'Things I love', '向我提问': 'Ask me', '联系我': 'Contact me',
    '性格侧写': 'Personality description', '赞助支持': 'Support my work', '技能': 'Skills',
    '工作经历': 'Experience', '我的项目': 'My projects', '社交媒体': 'Social media',
    '与我联系': 'Get in touch', '网站': 'Websites', '查看我的精选网站和项目': 'Selected websites and projects',
    '友情链接': 'Friends', '一些朋友的小站': "Some friends' websites", '语言': 'Language', '主题': 'Theme',
    '最大的喜悦莫过于将内心所想的事物转化为实际的作品': 'The greatest joy is turning ideas into real projects',
    '如果您喜欢我的工作，可以通过以下方式支持我：': 'If you like my work, you can support me here:',
    '哔哩哔哩': 'Bilibili', '爱发电': 'Afdian', 'Open main menu': 'Open main menu',
}

def soup_text(html):
    return BeautifulSoup(html, 'html.parser')

def fill(node, value):
    if isinstance(value, dict):
        zh, en = value['zh'], value.get('en', value['zh'])
    else:
        zh = en = str(value)
    node.clear()
    node.append(zh)
    node['data-zh'] = zh
    node['data-en'] = en
    return node

def label(node, value):
    for child in list(node.children):
        if isinstance(child, NavigableString):
            child.extract()
        elif child.name == 'span' and child.has_attr('data-zh'):
            child.decompose()
    span = soup_text('<span></span>').span
    fill(span, value)
    node.append(span)

def add(html):
    return soup_text(html).find()

def bind_link(node, url):
    if url:
        node['href'] = url
        node.attrs.pop('aria-disabled', None)
        if url.startswith('http'):
            node['target'] = '_blank'
            node['rel'] = 'noopener noreferrer'
    else:
        node.name = 'div'
        for key in ['href', 'target', 'rel']:
            node.attrs.pop(key, None)
        node['aria-disabled'] = 'true'
        for button in node.select('button'):
            button['disabled'] = ''
            label(button, {'zh': '待填写', 'en': 'To fill'})

def body_main(s):
    return s.select('main')[-1].div

def prepare(page):
    s = soup_text((UPSTREAM / (page + '.html')).read_text(encoding='utf-8'))
    for element in s.select('script, iframe, link'):
        element.decompose()
    for comment in s.find_all(string=lambda v: isinstance(v, Comment)):
        comment.extract()
    for element in s.select('[data-nimg], [data-cfemail]'):
        element.attrs.pop('data-nimg', None)
        element.attrs.pop('data-cfemail', None)
    for meta in s.select('meta[name="keywords"], meta[name="next-size-adjust"]'):
        meta.decompose()
    fill(s.title, CONTENT['name'] + ' | ' + CONTENT['handle'])
    s.title.attrs.clear()
    s.select_one('meta[name="description"]')['content'] = CONTENT['name'] + '的个人主页'
    s.html['lang'] = 'zh-CN'
    s.body['data-page'] = page
    # The upstream hydration payload contains the former owner's data and relies
    # on Next's server. Keep the raw archive, but use a static interaction adapter.
    for path in ['/template/assets/css/template.css', '/style.css']:
        s.head.append(s.new_tag('link', rel='stylesheet', href=path))
    s.head.append(s.new_tag('link', rel='icon', href='/' + CONTENT['avatar']))
    boot = s.new_tag('script')
    boot.string = 'try{document.documentElement.classList.toggle("dark",localStorage.getItem("celery-theme")==="dark")}catch{}'
    s.head.append(boot)
    nav = s.select_one('body > nav')
    fill(nav.select_one('a'), CONTENT['handle'])
    for a in nav.select('a'):
        href = a.get('href', '')
        if href.startswith('https://blog.'):
            a.decompose()
        elif href in ['/', '/about', '/projects', '/social']:
            a['href'] = href if href == '/' else href + '/'
            if (href.strip('/') or 'home') == page:
                a['aria-current'] = 'page'
    for button in nav.select('button'):
        for key in ['id', 'aria-haspopup', 'data-state']:
            button.attrs.pop(key, None)
        if button.select_one('.lucide-globe'):
            button['data-action'] = 'language'
            button['aria-label'] = '切换语言'
            button.attrs.pop('aria-expanded', None)
        elif button.select_one('.lucide-sun'):
            button['data-action'] = 'theme'
            button['aria-label'] = '切换主题'
        elif button.select_one('.lucide-menu'):
            button['data-action'] = 'menu'
            button['aria-expanded'] = 'false'
            button['aria-controls'] = 'mobile-nav'
            button['aria-label'] = '打开导航'
    mobile = add('<div id="mobile-nav" class="md:hidden border-t border-pink-200 p-4" hidden></div>')
    for a in nav.select('div.hidden.md\\:block a'):
        mobile.append(deepcopy(a))
    nav.append(mobile)
    for img in s.select('img'):
        if 'kldhsh.jpg' in img.get('src', ''):
            img['src'] = '/' + CONTENT['avatar']
            img['alt'] = CONTENT['name'] + '的头像'
    return s

def home(s):
    main = body_main(s)
    copy = main.select_one('.text-center.md\\:text-left')
    fill(copy.h1, CONTENT['name'])
    paras = copy.find_all('p', recursive=False)
    fill(paras[1], {'zh': '别名: ' + CONTENT['aliases'], 'en': 'Aliases: ' + CONTENT['aliases']})
    fill(paras[2], CONTENT['tagline'])
    identities = main.select_one('ul')
    sample = deepcopy(identities.li)
    identities.clear()
    for identity in CONTENT['identities']:
        entry = deepcopy(sample)
        fill(entry.span, identity)
        identities.append(entry)
    loading = main.select_one('.animate-spin').parent
    loading.clear()
    latest = add('<a href="/projects/" class="text-sm text-pink-600 dark:text-pink-300"></a>')
    fill(latest, {'zh': '最新作品 · ' + PROJECTS[0]['name'], 'en': 'Latest project · ' + PROJECTS[0]['name']})
    loading.append(latest)

def persistent_music(s):
    music = add('<div id="music-player" class="template-music bg-white dark:bg-gray-800 rounded-lg shadow-lg"><span></span><button class="bg-pink-500 text-white rounded-md px-4 py-2" data-action="music" aria-label="播放音乐">播放</button><p role="status" aria-live="polite"></p></div>')
    fill(music.span, CONTENT['music']['title'] + ' · ' + CONTENT['music']['artist'])
    s.body.append(music)
    audio = s.new_tag('audio', id='site-audio', loop='', preload='none', src='/' + CONTENT['music']['src'])
    s.body.append(audio)

def make_tabs(s, section):
    desktop, mobile = section.select_one('.hidden.md\\:flex'), section.select_one('.md\\:hidden')
    template_card = deepcopy(desktop.select_one('.flex-1 > .space-y-6 > div'))
    # These five values and their scale directions were supplied by the owner.
    fill(template_card.h3, CONTENT['personality']['type'])
    rows = template_card.select_one('.space-y-5')
    rows.clear()
    for dimension in CONTENT['personality']['dimensions']:
        value = dimension.get('value')
        row = add('<div class="personality-scale"><div class="scale-score"></div><div class="scale-rail" role="progressbar"><span class="scale-marker"></span></div><div class="scale-poles"><span></span><span></span></div></div>')
        position = 100 - value if dimension.get('pole') == 'left' else value
        row['style'] = '--scale-color:' + dimension['color'] + ';--scale-position:' + str(position) + '%'
        fill(row.select_one('.scale-score'), {'zh': str(value) + '% ' + dimension['zh'], 'en': str(value) + '% ' + dimension['en']})
        poles = row.select('.scale-poles > span')
        fill(poles[0], dimension['left'])
        fill(poles[1], dimension['right'])
        bar = row.select_one('[role="progressbar"]')
        bar['aria-label'] = dimension['zh']
        bar['aria-valuenow'] = str(value)
        bar['aria-valuemin'] = '0'
        bar['aria-valuemax'] = '100'
        rows.append(row)
    fill(template_card.select_one('h4 + p'), CONTENT['personality']['description'])
    template_card.select_one('.pt-4.pb-2').decompose()
    for shell in [desktop.select_one('.flex-1'), mobile.find_all('div', recursive=False)[1]]:
        shell.clear()
        for key, title in [('personality', '我的性格'), ('loves', '我喜爱的'), ('askme', '向我提问'), ('contact', '联系我')]:
            card = deepcopy(template_card)
            card['data-tab-panel'] = key
            if key != 'personality':
                card['hidden'] = ''
                heading, content = card.find_all('div', recursive=False)
                fill(heading.div, {'zh': title, 'en': UI[title]})
                content.clear()
                if key == 'loves':
                    for item in CONTENT['interests']:
                        p = add('<p class="text-gray-700 dark:text-gray-300 leading-relaxed"></p>')
                        fill(p, item)
                        content.append(p)
                elif key == 'askme':
                    content.append(fill(add('<p class="text-gray-700 dark:text-gray-300"></p>'), CONTENT['questions']))
                else:
                    link = add('<a href="/social/" class="text-pink-600 dark:text-pink-300 underline"></a>')
                    fill(link, {'zh': '前往社交页面与我联系', 'en': 'Get in touch on the social page'})
                    content.append(link)
            shell.append(card)
    for group in [desktop, mobile]:
        for button, key in zip(group.select('button'), ['personality', 'loves', 'askme', 'contact']):
            button['data-tab'] = key
            button['aria-pressed'] = 'true' if key == 'personality' else 'false'
            button['data-active-class'] = ' '.join(group.select('button')[0]['class'])
            button['data-inactive-class'] = ' '.join(group.select('button')[1]['class'])
    title = section.select_one('[title]')
    title.attrs.pop('title', None)
    title['class'] = [x for x in title['class'] if x not in ['cursor-pointer', 'hover:text-pink-700']]

def about(s):
    main = body_main(s)
    blocks = main.find_all('div', recursive=False)
    fill(blocks[0].p, CONTENT['intro'])
    profile = blocks[1].select_one('.md\\:w-2\\/3')
    fill(profile.h3, CONTENT['name'] + ' (' + CONTENT['aliases'] + ')')
    fill(profile.find('p', recursive=False), CONTENT['intro'])
    fill(profile.select_one('.my-5 p'), CONTENT['learning'])
    fill(profile.blockquote, CONTENT['tagline'])
    badges = profile.select_one('.mt-5').find_all('div', recursive=False)[-1]
    sample = deepcopy(badges.find('span') or badges.find('div'))
    badges.clear()
    for tech in CONTENT['technologies']:
        badge = deepcopy(sample)
        fill(badge, tech)
        badges.append(badge)
    make_tabs(s, blocks[2])
    sponsor = blocks[3].a
    bind_link(sponsor, CONTENT['sponsorUrl'])
    if CONTENT['sponsorUrl']:
        sponsor.clear()
        fill(sponsor, {'zh': '支持我的工作', 'en': 'Support my work'})
    else:
        sponsor.clear()
        fill(sponsor, {'zh': '[待填写：赞助链接]', 'en': '[To fill: support link]'})
    blocks[4]['class'].append('skills-experience-grid')
    skill_card, work_card = blocks[4].find_all('div', recursive=False)
    skill_card['id'] = 'skills'
    skill_rows = skill_card.select_one('.space-y-6')
    skill_rows.clear()
    radar = add('<div class="skills-radar" data-radar></div>')
    skill_rows.append(radar)
    assessment = add('<p class="skill-assessment text-sm text-gray-500 dark:text-gray-400"></p>')
    fill(assessment, {'zh': '主观评估 · 100分制', 'en': 'Self-assessment · out of 100'})
    skill_rows.append(assessment)
    for skill in CONTENT['skills']:
        row = add('<div class="skill-row"><div class="skill-heading"><span></span><span></span></div><div class="skill-track" role="progressbar"><div></div></div><p></p></div>')
        row['style'] = '--skill-color:' + skill['color']
        spans = row.select('.skill-heading > span')
        fill(spans[0], skill['name'])
        level = skill.get('value')
        fill(spans[1], str(level) + '/100')
        bar = row.select_one('.skill-track')
        bar['aria-label'] = skill['name']['zh']
        bar['aria-valuenow'] = str(level)
        bar['aria-valuemin'] = '0'
        bar['aria-valuemax'] = '100'
        bar.div['style'] = 'width:' + str(level) + '%'
        fill(row.p, skill['description'])
        skill_rows.append(row)
    work_rows = work_card.select_one('.space-y-6')
    sample = deepcopy(work_rows.find('div', recursive=False))
    work_rows.clear()
    for exp in CONTENT['experience']:
        row = deepcopy(sample)
        row.h3.clear()
        row.h3.append(fill(add('<span></span>'), exp['title']))
        row.h3.append(fill(add('<del class="struck-title"></del>'), exp['struckTitle']))
        row.h3.append(fill(add('<span></span>'), exp['titleSuffix']))
        fill(row.p, exp['description'])
        if exp['url']:
            bind_link(row.a, exp['url'])
            fill(row.a, exp['url'])
        else:
            row.a.parent.decompose()
        work_rows.append(row)
    joke = add('<div class="experience-joke"><p></p><div class="joke-companies"></div><p></p><p class="joke-afterword"></p></div>')
    paragraphs = joke.find_all('p', recursive=False)
    fill(paragraphs[0], CONTENT['experienceJoke']['opening'])
    for company in CONTENT['experienceJoke']['companies']:
        joke.select_one('.joke-companies').append(fill(add('<p></p>'), company))
    fill(paragraphs[1], CONTENT['experienceJoke']['closing'])
    fill(paragraphs[2], CONTENT['experienceJoke']['afterword'])
    work_rows.append(joke)
    poem = add('<section class="poem-card rounded-lg border bg-white dark:bg-gray-800 border-pink-200 dark:border-pink-800"><blockquote></blockquote></section>')
    fill(poem.blockquote, CONTENT['poem'])
    main.append(poem)

def projects(s):
    main = body_main(s)
    grid = main.find_all('div', recursive=False)[1]
    grid['id'] = 'project-grid'
    toolbar = add('<div class="project-toolbar"><label class="project-search"><svg class="search-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m16 16 5 5"></path></svg><span class="sr-only" data-zh="搜索项目" data-en="Search projects">搜索项目</span><input id="project-search" type="search" placeholder="搜索项目名称或描述…" data-placeholder-zh="搜索项目名称或描述…" data-placeholder-en="Search projects by name or description…" autocomplete="off"/></label><label class="project-select"><span data-zh="分类" data-en="Category">分类</span><select id="project-category"><option value="all" data-zh="全部" data-en="All">全部</option><option value="desktop" data-zh="桌面工具" data-en="Desktop tools">桌面工具</option><option value="games" data-zh="游戏" data-en="Games">游戏</option><option value="music" data-zh="音乐" data-en="Music">音乐</option></select></label><label class="project-select"><span data-zh="标签" data-en="Tags">标签</span><select id="project-tag"><option value="all" data-zh="全部" data-en="All">全部</option><option value="new" data-zh="新" data-en="New">新</option><option value="hot" data-zh="热" data-en="Hot">热</option><option value="legacy" data-zh="遗产" data-en="Legacy">遗产</option></select></label></div>')
    grid.insert_before(toolbar)
    count = add('<p id="project-count" role="status" aria-live="polite"></p>')
    grid.insert_before(count)
    sample = deepcopy(grid.find('div', recursive=False))
    grid.clear()
    for project in PROJECTS:
        card = deepcopy(sample)
        card['data-project'] = project['id']
        tags = project.get('tags', []) or ([project['label']] if project.get('label') else [])
        card['data-tags'] = ' '.join(tags)
        card['data-category'] = project['category']
        card['data-search'] = ' '.join([project['name'], project['description']['zh'], project['description']['en']]).lower()
        card.img['src'] = '/' + project['image']
        card.img['alt'] = project['name']
        card.img['loading'] = 'lazy'
        parts = card.find_all('div', recursive=False)
        fill(parts[1].find_all('div', recursive=False)[0], project['name'])
        fill(parts[1].find_all('div', recursive=False)[1], project['description'])
        parts[2].clear()
        if project.get('note'):
            parts[2].append(fill(add('<p class="text-sm text-gray-500 dark:text-gray-400"></p>'), project['note']))
        if tags:
            badges = add('<div class="project-badges"></div>')
            for tag in tags:
                badge = add('<span class="project-badge"></span>')
                badge['class'].append('tag-' + tag)
                fill(badge, {'zh': {'new':'新', 'hot':'热', 'legacy':'遗产'}[tag], 'en': tag.upper()})
                badges.append(badge)
            parts[1].insert(1, badges)
        action = parts[3].a
        button = action.button
        # Unwrap nested button elements to make the original card action accessible.
        action['class'] = button['class']
        button.unwrap()
        if project.get('routes'):
            action.name = 'button'
            for key in ['href', 'target', 'rel']:
                action.attrs.pop(key, None)
            action['type'] = 'button'
            action['data-download'] = project['id']
            label(action, {'zh': '获取下载', 'en': 'Download'})
        else:
            bind_link(action, project['url'])
            label(action, {'zh': '访问项目', 'en': 'Visit'})
        grid.append(card)
    empty = add('<div id="project-empty" class="project-empty" hidden><p data-zh="没有找到匹配的项目。" data-en="No matching projects.">没有找到匹配的项目。</p><button data-action="reset-search" data-zh="查看全部项目" data-en="Show all projects">查看全部项目</button></div>')
    main.append(empty)
    dialog = add('<dialog id="download-dialog"><div class="download-heading"><h2 id="download-title"></h2><button data-action="close-dialog" aria-label="关闭">×</button></div><p id="download-note"></p><div id="download-routes"></div><p id="download-status" role="status" aria-live="polite"></p></dialog>')
    dialog['aria-labelledby'] = 'download-title'
    s.body.append(dialog)

def social(s):
    blocks = body_main(s).find_all('div', recursive=False)
    cards = blocks[1].find_all(recursive=False)
    for card, entry in zip(cards, CONTENT['socials']):
        fill(card.h3, {'zh': entry['platform'], 'en': UI.get(entry['platform'], entry['platform'])})
        fill(card.p, entry['label'])
        if card.name != 'a':
            card.name = 'a'
        button = card.button
        card['data-platform'] = entry['platform']
        bind_link(card, entry['url'])
        if entry['url']:
            label(button, {'zh': '与我联系', 'en': 'Get in touch'})
        else:
            label(button, entry.get('unavailable', {'zh':'待填写', 'en':'To fill'}))
        button.name = 'span'
        button.attrs.pop('disabled', None)
        if not entry['url'] and entry.get('unavailable'):
            button.decompose()
    site_grid = blocks[2].select_one('.grid')
    sample = deepcopy(site_grid.a)
    site_grid.clear()
    for site in CONTENT['websites']:
        a = deepcopy(sample)
        label(a.button, site['name'])
        a['class'] = a.button['class']
        a.button.unwrap()
        bind_link(a, site['url'])
        if site.get('note'):
            a.append(fill(add('<small class="website-note"></small>'), site['note']))
        site_grid.append(a)
    friend_grid = blocks[3].select_one('.grid')
    sample = deepcopy(friend_grid.a)
    friend_grid.clear()
    for friend in CONTENT['friends']:
        a = deepcopy(sample)
        fill(a.h3, friend['name'])
        ps = a.select('p')
        ps[0].decompose()
        fill(ps[1], friend['description'])
        a.img['src'] = '/' + friend['avatar']
        a.img['alt'] = (friend['name']['zh'] if isinstance(friend['name'], dict) else friend['name']) + '的头像'
        bind_link(a, friend['url'])
        friend_grid.append(a)

def finish(s, page):
    persistent_music(s)
    # All static UI text also gets a language pair, without rebuilding any layout.
    for text in list(s.body.find_all(string=True)):
        value = str(text).strip()
        if value in UI and text.parent.name not in ['script', 'style'] and not text.parent.has_attr('data-zh'):
            span = s.new_tag('span')
            fill(span, {'zh': value, 'en': UI[value]})
            text.replace_with(span)
    for a in s.select('a[href]'):
        if a['href'] in ['/about', '/projects', '/social']:
            a['href'] += '/'
        if a.find('button', recursive=False):
            button = a.find('button', recursive=False)
            a['class'] = button.get('class', [])
            button.unwrap()
    nested_main = s.select('main main')
    for element in nested_main:
        element.name = 'div'
    s.select_one('main')['tabindex'] = '-1'
    data = s.new_tag('script', type='application/json', id='site-data')
    data.string = json.dumps({'projects': PROJECTS, 'skills': CONTENT['skills']}, ensure_ascii=False).replace('<', '\\u003c')
    s.body.append(data)
    # Correct SVG attribute case lowered by Python's HTML parser.
    for svg in s.select('svg'):
        if 'viewbox' in svg.attrs:
            svg['viewBox'] = svg.attrs.pop('viewbox')
    s.body.append(s.new_tag('script', src='/script.js', defer=''))
    path = ROOT / 'index.html' if page == 'home' else ROOT / page / 'index.html'
    path.parent.mkdir(exist_ok=True)
    path.write_text(str(s) + '\n', encoding='utf-8', newline='\n')

def assets():
    original = UPSTREAM / 'files' / 'kldhsh.top' / '_next' / 'static'
    target = ROOT / 'template' / 'assets'
    (target / 'css').mkdir(parents=True, exist_ok=True)
    shutil.copytree(original / 'media', target / 'media', dirs_exist_ok=True)
    css = next((original / 'css').glob('*.css')).read_text(encoding='utf-8')
    # Change color values inside the exact downloaded stylesheet; selectors and
    # breakpoints remain upstream's. The original CSS is untouched in the archive.
    colors = {
        '253 242 248':'242 250 255', '252 231 243':'223 244 255', '251 207 232':'185 233 255',
        '249 168 212':'139 220 255', '244 114 182':'139 220 255', '236 72 153':'102 204 255',
        '219 39 119':'25 131 181', '190 24 93':'23 103 139', '157 23 77':'20 83 113',
        '131 24 67':'17 62 87', '80 7 36':'9 34 51', '168 85 247':'90 181 236',
    }
    for old,new in colors.items():
        css=css.replace(old,new)
        old_hex = '#' + ''.join(f'{int(channel):02x}' for channel in old.split())
        new_hex = '#' + ''.join(f'{int(channel):02x}' for channel in new.split())
        css=css.replace(old_hex,new_hex)
    css=css.replace('330 81% 60%', '200 100% 70%').replace('330 ', '200 ')
    css=css.replace('/_next/static/media/', '/template/assets/media/')
    (target / 'css' / 'template.css').write_text(css, encoding='utf-8', newline='\n')

def main():
    assets()
    for page, transform in [('home',home),('about',about),('projects',projects),('social',social)]:
        s=prepare(page)
        transform(s)
        finish(s,page)
        print('Generated',page)

if __name__ == '__main__':
    main()
