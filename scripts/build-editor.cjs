const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'backend/public/admin/vendor');
fs.mkdirSync(out, { recursive: true });
for (const [source, name] of [
  ['dompurify/dist/purify.min.js','purify.min.js'],
  ['dompurify/LICENSE','DOMPURIFY-LICENSE'],
  ['turndown/lib/turndown.browser.umd.js','turndown.js'],
  ['turndown/LICENSE','TURNDOWN-LICENSE']
]) fs.copyFileSync(path.join(root,'node_modules',source), path.join(out,name));
console.log('Editor assets prepared');
