"""Archive the public browser files of kldhsh.top, without claiming server source."""
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'template' / 'upstream'
BASE = 'https://kldhsh.top/'

def download(url):
    parsed = urlparse(url)
    path = ARCHIVE / 'files' / parsed.netloc / parsed.path.lstrip('/')
    if not path.suffix:
        path = path / 'index.html'
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        data = urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30).read()
        path.write_bytes(data)
        return {'url': url, 'path': path.relative_to(ROOT).as_posix(), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
    except Exception as error:
        return {'url': url, 'error': str(error)}

def main():
    pending = set()
    for page in ARCHIVE.glob('*.html'):
        soup = BeautifulSoup(page.read_text(encoding='utf-8'), 'html.parser')
        for element in soup.select('script[src], link[href], img[src]'):
            url = urljoin(BASE, element.get('src') or element.get('href'))
            if urlparse(url).netloc in ('kldhsh.top', 'cdn.kldhsh.top'):
                pending.add(url)
        for chunk in re.findall(r'static/chunks/[^"\\\s]+\.js', page.read_text(encoding='utf-8')):
            pending.add(urljoin(BASE, '_next/' + chunk))
    done = set()
    records = []
    while pending:
        batch = sorted(pending - done)
        if not batch:
            break
        done.update(batch)
        with ThreadPoolExecutor(max_workers=6) as pool:
            downloaded = list(pool.map(download, batch))
        pending = set()
        for record in downloaded:
            records.append(record)
            if 'error' in record:
                print('FAILED', record['url'], record['error'])
                continue
            path = ROOT / record['path']
            if path.suffix == '.css':
                content = path.read_text(encoding='utf-8')
                for value in re.findall(r'url\(([^)]+)\)', content):
                    if not value.startswith('data:'):
                        pending.add(urljoin(record['url'], value.strip('"\'')))
            elif path.suffix == '.js':
                content = path.read_text(encoding='utf-8')
                for value in re.findall(r'https://cdn\.kldhsh\.top/[^"\s\\]+', content):
                    pending.add(value)
        print('Archived', len(records), 'files')
    pages = [{'url': urljoin(BASE, '' if p.stem == 'home' else p.stem), 'path': p.relative_to(ROOT).as_posix(), 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(ARCHIVE.glob('*.html'))]
    report = {'origin': BASE, 'captured_on': '2026-10-14', 'scope': 'Public HTML, referenced browser chunks, CSS, fonts and media. Server source is not available.', 'pages': pages, 'files': records}
    (ARCHIVE / 'manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')

if __name__ == '__main__':
    main()
