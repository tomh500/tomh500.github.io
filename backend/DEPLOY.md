# Lemoe 博客部署与维护

网站继续托管在 GitHub Pages；Worker 只负责登录、草稿、留言和发布。
Ubuntu 服务器及其数据库没有被连接或修改。

## 本地检查

```powershell
npm ci
npm test
npm run db:local
npm run dev:backend
```

写作台：`http://127.0.0.1:8787/admin/`。没有生产 OAuth 配置时只能检查未登录页面；本项目不提供绕过鉴权的开发入口。登录和跨域 Cookie 联调请使用 HTTPS 测试域名。

前台：安装 `requirements-template.txt` 后运行 `python scripts/build-template.py`，再运行 `python -m http.server 8765 --bind 127.0.0.1`。博客 `/blog/`、留言板 `/guestbook/`。`blog-config.json` 的 `apiOrigin` 留空时显示“留言功能准备中”。

## 1. Cloudflare 账号和数据库

在仓库根目录执行：

```powershell
npx wrangler login --scopes account:read user:read workers:write workers_scripts:write workers_routes:write d1:write zone:read
npx wrangler d1 create lemoe-blog
```

将创建结果的数据库 ID 填入 `backend/wrangler.jsonc` 的 `database_id`，有多个账号时同时填写正确的 `account_id`。再执行：

```powershell
npm run db:remote
```

后台域名使用 `https://blog-api.luotiany1.top`。在 Worker 的 Domains & Routes 添加这个 Custom Domain；域名需在你的 Cloudflare 账号中。前台继续使用 `https://luotiany1.top`。

Worker 的 `API_ORIGIN` 必须与实际后台域名一致，`SITE_ORIGIN` 必须是前台 HTTPS origin（均不含末尾斜线），`ADMIN_GITHUB_ID` 为已核对的 `95513888`。管理员权限按 GitHub 数字 ID 判断，不按昵称，也不会把第一个登录的人设为管理员。

## 2. GitHub 登录

快捷向导（Windows PowerShell 5.1 / PowerShell 7）：运行 `./scripts/configure-blog.ps1`，按说明创建下述登录应用和发布 token，然后在隐藏提示中粘贴。向导直接通过 stdin 写入 Cloudflare Secret，不会把值写入仓库、命令行参数或聊天。单独保存发布 Token 用 `./scripts/configure-blog.ps1 -SecretName GITHUB_PUBLISH_TOKEN`；需要代理时增加 `-ProxyUrl http://127.0.0.1:7890`（按实际端口修改）。`-Check` 可只检查兼容性，不读取或上传密钥。

到 GitHub Settings → Developer settings → OAuth Apps → New OAuth App 创建仅用于登录的应用：

- Homepage URL：`https://luotiany1.top`
- Authorization callback URL：`https://blog-api.luotiany1.top/auth/callback`

后台只读取登录用户公开身份，不向访客请求仓库写入权限。Client Secret 仅输入下列命令的隐藏输入提示，不发到聊天、不提交到仓库：

```powershell
npx wrangler secret put GITHUB_CLIENT_ID --config backend/wrangler.jsonc
npx wrangler secret put GITHUB_CLIENT_SECRET --config backend/wrangler.jsonc
```

## 3. 发布文章的凭据

在站长账号创建 Fine-grained personal access token：只选择 `tomh500/tomh500.github.io`，Repository permissions → Contents: Read and write。设置有效期，并在到期前更换。该权限在 GitHub 层面覆盖所选仓库，不能精确限制到文章目录；Worker 的发布代码固定写入 `content/posts/<slug>.json`，不会接受客户端传入的仓库或文件路径。密钥泄露时仍须立即撤销。

```powershell
npx wrangler secret put GITHUB_PUBLISH_TOKEN --config backend/wrangler.jsonc
```

此凭据与访客登录凭据完全独立，不会发送到前端。若分支保护阻止直接提交，应先调整发布策略，不能通过放宽用户登录权限解决。

## 4. 反垃圾验证

建议创建 Turnstile widget，允许域名 `luotiany1.top`。在 Worker vars 设置公开的 `TURNSTILE_SITE_KEY`；通过 Secret 设置 `TURNSTILE_SECRET`。必须成对配置。

```powershell
npx wrangler secret put TURNSTILE_SECRET --config backend/wrangler.jsonc
```

未接 Turnstile 时仍要求 GitHub 登录、每账号 30 秒一次、2000 字上限和站长审核。可在 Cloudflare 侧进一步限制登录和留言接口的请求频率。

## 5. 部署后台并连接前台

```powershell
npm run deploy:backend
```

绑定后台域名后，将 `blog-config.json` 的 `apiOrigin` 改为 `https://blog-api.luotiany1.top` 并重新构建前台。前后台需使用同一主域的 HTTPS 子域，确保 SameSite=Lax 的登录 Cookie 可以正常用于留言。不要用 `workers.dev` 后台配 `luotiany1.top` 前台来验证登录状态。

在 GitHub 仓库 Settings → Pages 将 Source 切换为 **GitHub Actions**。`.github/workflows/pages.yml` 会在推送 `nextgen` 后构建并部署；工作流仅打包公开目录，不上传 backend、依赖、草稿数据库或本地配置。

首次部署代码后，登录写作台，新建文章、保存草稿、预览、发布。发布会使用站长专用 token 提交文章 JSON，触发 Actions；页面更新通常需要等待构建完成。后台提示“已提交”表示 GitHub 接收了提交，不保证 Pages 已经部署成功；部署进度在仓库 Actions 查看。

## 数据和维护

- 草稿只在 D1；点击发布才会生成公开仓库中的文章 JSON。不要把私密内容写入已发布文章。
- 下线会删除当前分支的文章文件并保留 D1 草稿；旧 Git 历史和外部缓存不会自动消失。
- 修改公开仓库中已有的文章不会自动反向更新 D1 草稿。第一版以写作台为编辑入口，避免双向编辑冲突。
- 公共留言接口只返回审核通过的文本、公开 GitHub 昵称和头像。前端用 `textContent` 显示留言，不执行留言中的 HTML。
- Markdown 预览和静态文章均禁用原始 HTML，禁止危险链接协议；暂不支持粘贴脚本、iframe 或自定义 HTML。
- 评论最近 200 条在后台管理；前台每页 50 条，按时间和 ID 分页。文章后台最多展示最近 200 篇。
- 登录会话有效期 7 天，使用 HttpOnly / Secure / SameSite=Lax Cookie，数据库只存会话令牌的 SHA-256。
- 草稿使用版本号避免覆盖，未保存时离开页面有提醒；还可以导出 Markdown 备份。
- 定期用 `npx wrangler d1 export DB --remote --config backend/wrangler.jsonc --output <私有备份路径>` 导出数据库。导出含草稿及会话信息，不能放到公开仓库。
- 定期检查依赖更新、Cloudflare 用量和 GitHub token 到期日期。

将来接入 Ubuntu：可以迁移后端到独立虚拟机及 MySQL/PostgreSQL 等数据库，前台的 API 合约和文章 JSON 格式仍可保留。第一版没有启用 Tunnel、SSH、数据库公网端口或家庭网络路由。
