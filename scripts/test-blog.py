"""Verify real static article output and removal in an isolated generated tree."""
from pathlib import Path
import importlib.util
import json
import shutil
import tempfile
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('build', ROOT / 'scripts' / 'build-template.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)
with tempfile.TemporaryDirectory() as folder:
    target = Path(folder)
    for name in ['site-content.json','site-config.js','script.js','style.css','blog-config.json','blog.js','scripts/build-template.py','template/assets/css/template.css']:
        dest = target / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / name, dest)
    posts = target / 'content' / 'posts'
    posts.mkdir(parents=True)
    fixture = {'slug':'test-story','title':'Title <script>','summary':'A test story','tags':['C++'], 'body':'# Hello\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n**Strong** text', 'publishedAt':'2026-10-30T00:00:00.000Z','updatedAt':'2026-10-30T00:00:00.000Z'}
    (posts / 'test-story.json').write_text(json.dumps(fixture), encoding='utf-8')
    visitor={**fixture,'slug':'guest-story','title':'Visitor story','community':True,'author':'reader'}
    (posts / 'guest-story.json').write_text(json.dumps(visitor),encoding='utf-8')
    build.ROOT = target
    build.blogs()
    article = target / 'blog' / 'test-story' / 'index.html'
    soup = BeautifulSoup(article.read_text(encoding='utf-8'), 'html.parser')
    assert soup.select_one('.blog-prose strong').get_text() == 'Strong'
    assert not soup.select('.blog-prose script')
    assert not soup.select('a[href^="javascript:"]')
    assert soup.select_one('h1').get_text() == fixture['title']
    assert soup.select_one('[data-comments]')['data-thread'] == 'post:test-story'
    assert 'Lemoe Serina' in soup.select_one('.blog-post-meta')['data-en']
    blog=BeautifulSoup((target/'blog/index.html').read_text(encoding='utf-8'),'html.parser')
    assert 'Visitor story' not in blog.get_text()
    community=BeautifulSoup((target/'community/index.html').read_text(encoding='utf-8'),'html.parser')
    assert community.select_one('details.community-post') is not None
    assert not community.select_one('details.community-post').has_attr('open')
    assert (target/'community/guest-story/index.html').exists()
    assert not (target/'blog/guest-story/index.html').exists()
    for page in ['blog/index.html', 'guestbook/index.html']:
        html = BeautifulSoup((target / page).read_text(encoding='utf-8'), 'html.parser')
        assert html.select_one('a[href="/blog/"]') and html.select_one('a[href="/guestbook/"]')
    (posts / 'test-story.json').unlink()
    build.blogs()
    assert not article.exists(), 'Unpublished article must not remain in output'
print('Static article, safe Markdown, navigation and unpublish verified')
