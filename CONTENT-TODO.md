# 内容替换与待填写清单

当前分支：`codex/kldhsh-template`。个人内容修改 `site-content.json`，项目和下载线路修改 `site-config.js`；修改后运行 `python scripts/build-template.py`，四页会一起更新。

| 待填写内容 | 配置位置 | 页面位置 |
| --- | --- | --- |
| 个人介绍（中文、英文） | `intro.zh` / `intro.en` | 关于页标题下方、头像右侧 |
| 首页短句（中文、英文） | `tagline.zh` / `tagline.en` | 首页引言、关于页引言 |
| 性格侧写 | `personality.description` | 关于页 → 我的性格 |
| MBTI 各维度分数 | `personality.dimensions[].value` | 关于页 → 我的性格；未知时保持 `null` |
| 技能熟练度 | `skills[].value` | 关于页 → 技能；未知时保持 `null` |
| 经历名称、描述、链接 | `experience[]` | 关于页 → 工作经历 |
| 想被问的话题或提问入口 | `questions` | 关于页 → 向我提问 |
| 博客地址 | `blogUrl` | 桌面导航；未填写时显示占位文字 |
| 赞助地址 | `sponsorUrl` | 关于页 → 赞助支持 |
| 公开 QQ、Telegram、邮箱 | `socials[]` 对应项的 `label` 与 `url` | 社交页；未填写时没有跳转 |
| 朋友网站、介绍、头像 | `friends[]` | 社交页 → 友情链接 |

不要把模板作者的账号、介绍、分数、职务和友链当作自己的资料。上述未知项已清空或明确占位，未保留模板作者的可用联系方式。

已替换的内容及依据：

- **昵称“柠萌小芹菜”**：本次用户明确确认。
- **tomh500、头像、7 个项目、项目描述、下载来源、提取码、Bilibili UID、Discord 社区、背景音乐**：迁自本仓库现有内容。没有另外验证外部下载站当前可用性。
- **C++ / Python 开发爱好者、计算机科学与算法学习者、二次元文化与音乐爱好者**：2026-10-14 用户授权，通过 desktop-control 技能向 ChatGPT 网页版询问；这是它基于历史对话给出的身份标签整理，用户可改原话。
- **INFP**：同一次 ChatGPT 回复标为用户自述；它明确表示不知道维度分数。
- **C++、Python、Windows API、GSI、GDI+、Tkinter；C++、STL、算法与 Codeforces 学习方向**：同一次回复；技能比例未知，全部保留 `null`。
- **CS2、PUBG、原神；小鸟游六花、井芹仁菜、多托雷；中文 VOCALOID 早期抒情作品、《时间日记》、钢琴改编**：同一次回复。用户可逐项核对、删改。
- **luotiany1.top**：当前 `CNAME`，ChatGPT 回复也提到了该公开网站。

ChatGPT 对话记忆是本次受用户授权使用的内容来源，不等同于原始聊天记录逐条证据。它还提到过其他项目名称，但详细功能不确定，因此没有添加。用户没有提供确定原文的介绍、短句和性格侧写也没有代写。
