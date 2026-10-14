# 模板来源与改动方式

来源：<https://kldhsh.top/>，下载于 2026-10-14。

`upstream/` 保存实际下载的四页 HTML，及其引用的 30 个公开 CSS、JS、字体、图片文件。`upstream/manifest.json` 记录资源 URL、大小和 SHA-256。原始归档保留模板作者内容，供对照；当前主页不执行归档内的 Next.js / Cloudflare 脚本，也不读取模板作者的接口。

这是浏览器公开文件的完整已发现依赖归档，**不是服务器或未公开的 TSX 源码仓库**。未找到该个人网站的公开源码。没有尝试获取服务器文件或绕过访问控制。

`scripts/build-template.py` 直接读这些下载 HTML，按原有 DOM、卡片与响应式类名替换内容。导航、圆形头像、首页身份卡、关于页侧栏与手机标签、项目网格、社交卡、技能进度条和经历卡来自下载模板。新增静态适配器 `script.js` 实现主题、语言、手机菜单、关于页切换、下载弹窗、音乐控制，适用于 GitHub Pages。

`assets/css/template.css` 由原始 CSS 生成：保留选择器、排版和断点，将粉色 RGB/HEX/HSL 配色换为蓝色，主色 `#66ccff`；字体仍为原模板字体，并已本地化。`style.css` 补充下载窗口、常驻音乐、项目搜索、同色人格与技能条、动态 SVG 雷达图、经历调侃和中文引文的样式。

重生成无需网络：

```powershell
python -m pip install -r requirements-template.txt
python scripts/build-template.py
```

需要 Python、Beautiful Soup 和 Node.js（读取项目配置）。部署只需提交生成后的静态文件，GitHub Pages 无需安装构建依赖；`.nojekyll` 确保归档中的 `_next` 目录可被作为静态文件提供。

2026-10-14 本地检查：JavaScript 语法检查通过；四页本地引用存在；原始 HTML 和 30 个资源的 SHA-256 一致；浏览器检查了 1440px 桌面及 375px 手机布局，手机四页没有横向溢出或外部运行资源。已验证语言、主题刷新保存、手机菜单、关于页标签、下载弹窗、CCDManager 提取码复制、Escape 关闭、音乐播放与暂停。未重新下载软件或验证外部下载站当前可用性。

本轮追加检查：截图中的六项技能数值与雷达点一致；人格与技能条、雷达点全部为 `#66ccff`。项目名称／描述搜索、分类与标签组合、无结果与重置、局部切页后的下载弹窗均通过。站内导航和浏览器后退、前进时，音频仍在播放，播放时间继续增加。QQ 没有链接，StrikeBounce 不可点击；赞助、Telegram、邮箱及遥汐友链来自本次用户提供的地址。
