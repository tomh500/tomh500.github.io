"""Stage only public website assets. Backend, drafts and local dependencies stay out."""
from pathlib import Path
import shutil
ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'dist'
if DEST.exists():
    if DEST.is_symlink() or DEST.resolve() != ROOT.resolve() / 'dist':
        raise ValueError('Refusing to clean an unexpected staging directory')
    shutil.rmtree(DEST)
DEST.mkdir()
for name in ['index.html', 'style.css', 'script.js', 'blog.js', 'site-config.js', 'CNAME', '.nojekyll', 'bgm.ogg']:
    shutil.copy2(ROOT / name, DEST / name)
for name in ['about', 'projects', 'social', 'blog', 'guestbook', 'images', 'Square', 'MarFlash', 'styles', 'template/assets']:
    shutil.copytree(ROOT / name, DEST / name, dirs_exist_ok=True)
for path in DEST.rglob('.generated-posts.json'):
    path.unlink()
print('Public Pages files staged in dist/')
