# 柠萌小芹菜的个人主页

新增博客和留言板：前台仍由 GitHub Pages 托管，`backend/` 提供 Cloudflare Worker + D1 写作台、GitHub 登录、留言审核及发布到仓库。配置和上线步骤见 [backend/DEPLOY.md](backend/DEPLOY.md)。在 `blog-config.json` 配置后台域名前，留言显示准备中；已有静态页面仍可正常浏览。

写作台默认使用可视编辑，支持排版按钮、图片上传/粘贴、大图自动压缩和 Markdown 源码切换。访客登录后可保存个人草稿并投稿；站长审核通过后仅展示在 `/community/`，默认折叠，不进入站长博客列表。投稿修改后需要重新审核，未发布的上传图片仅作者和站长可读。

`content/posts/*.json` 只保存已发布文章；草稿保存在 D1。`npm test` 验证后台权限、草稿冲突、审核、登录状态及发布行为。写作台支持手机浏览器，无需打开 GitHub 编写文章；目前是网页应用，尚未提供原生 App。

当前在 `nextgen` 部署分支直接使用 **kldhsh.top 下载页面模板**，将个人资料和项目逐项替换，配色改为 `#66ccff`。原始下载文件保存在 `template/upstream/`，详细来源与适配说明见 `template/README.md`。

首页、关于我、项目、社交使用 `/`、`/about/`、`/projects/`、`/social/`，博客和留言板使用 `/blog/`、`/guestbook/`；已发布文章生成独立静态页面。兼容旧 `#about`、`#projects`、`#social` 链接。支持中英切换、浅色/深色主题、手机菜单、关于页标签、软件多线路下载、复制提取码、音乐播放。语言与主题保存在访问者的浏览器本地。

站内导航与浏览器后退/前进局部更新页面，音乐播放器及音频元素保持不变。所有页面都有播放器；刷新或离开网站会结束当前页面的播放。项目页支持搜索、分类与“新／热／遗产”标签筛选。关于页的能力雷达图由 JavaScript 读取 `site-content.json` 生成的技能数据绘制，分数与下方技能条使用同一份配置。

本地预览：

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

打开 <http://127.0.0.1:8765/>。

请使用这个 HTTP 地址预览。直接双击 `index.html` 时，网站根路径 `/style.css`、`/images/` 等会指向磁盘根目录，无法完整加载页面。

修改内容：

- `site-content.json`：昵称、别名、身份、兴趣、技能、个人资料、社交和占位符。
- `site-config.js`：项目、描述、封面、下载来源、提取码。
- `CONTENT-TODO.md`：所有待填写字段与资料依据。
- `images/iseri.gif`、`images/product/`、`bgm.ogg`：现有头像、项目封面和音乐。
- `scripts/build-template.py`：直接替换下载模板的生成脚本。
- `template/assets/css/template.css`：由下载的原始样式生成的蓝色模板，不要手工修改；调色请修改生成脚本。
- `style.css`、`script.js`：静态托管所需的少量样式与交互。

内容修改后更新全部页面：

生成脚本会为 CSS、JavaScript 地址附加内容哈希版本号，站内切页请求也带页面版本，以免 Cloudflare 或浏览器缓存让新版 HTML 使用旧资源。

```powershell
python -m pip install -r requirements-template.txt
python scripts/build-template.py
node --check script.js
node --check site-config.js
```

前台使用生成后的静态 HTML/CSS/JS。GitHub Pages 的 Source 已改为 GitHub Actions；推送 `nextgen` 会运行 `.github/workflows/pages.yml`，通过检查后生成页面、打包公开资源并发布到 `https://luotiany1.top/`。写作台发布文章也会触发同一流程。2026-10-31 移除了约 925 MB 的 `Square/CloudMusic/` 停维音乐，旧音乐列表保留为空；主页 `bgm.ogg`、Square 其他工具、`MarFlash/` 和 `CNAME` 保留。原主页可从 `d7f11c4` 提交恢复。
