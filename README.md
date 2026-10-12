# tomh500 的个人主页

纯静态 HTML / CSS / JavaScript，直接兼容 GitHub Pages，无需安装依赖或运行构建。主色为 `#66ccff`，支持浅色与深色主题、中文与英文、手机导航、项目搜索与分类。

## 本地预览

在仓库根目录运行：

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

打开 `http://127.0.0.1:8765/`。四个视图使用 `#home`、`#about`、`#projects`、`#social`，可以直接分享和刷新，无需服务器路由。

## 修改内容

- `index.html`：页面结构、默认中文内容和 SVG 图标。
- `style.css`：配色、布局、响应式样式与动效。
- `script.js`：中英文本、导航、主题、项目渲染、下载窗口和音乐播放。
- `site-config.js`：全部项目、下载线路、提取码与短句。
- `images/product/`：项目封面；`images/iseri.gif`：头像；`bgm.ogg`：音乐。
- `Square/`、`MarFlash/`、`CNAME`：保留原有产品资源及域名配置。

项目分类为 `desktop`、`games`、`music`。`label: 'new'` 显示“新”，`label: 'legacy'` 显示“已归档”；无标签时省略 `label`。有 `routes` 的项目打开下载弹窗，有 `url` 的项目直接跳转。新项目放在列表前面，归档项目放在后面。

运行 `python add_product.py` 可生成一个配置项，审核后粘贴到 `site-config.js` 的 `projects` 数组。此脚本不会自动覆盖网页。

新增文案应同时提供 `zh` / `en`。新增身份、联系方式和经历应先确认事实；没有确定的信息可以省略或明确标注“待填写”，不要编造。

## 检查

```powershell
node --check script.js
node --check site-config.js
```

在浏览器中检查：四个视图及后退/前进、手机导航、分类与搜索、无结果提示、下载窗口与 Escape、提取码、主题/语言刷新保存、音乐播放/暂停。

主题和语言仅保存到浏览器本地；音乐由访问者主动点击播放。网页不依赖外部字体、图标 CDN 或统计服务。

## 发布与恢复

当前 GitHub Pages 从 `nextgen` 分支部署。审核完成后，再提交和推送到该分支。

重构前的备份分支为 `backup/nextgen-20261013-035244`，提交 `0dac274`。可以通过 `git show backup/nextgen-20261013-035244:index.html` 查看旧页面，或切换该备份分支进行预览。
