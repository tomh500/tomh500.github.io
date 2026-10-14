# 内容与后续修改

当前分支：`codex/kldhsh-template`。个人资料修改 `site-content.json`，项目修改 `site-config.js`，然后运行 `python scripts/build-template.py` 并刷新预览。

本次指定内容已全部填入。**性格侧写** 使用用户提供的完整原文，修改位置为 `personality.description.zh`，英文翻译为 `personality.description.en`。四页正文、音乐标题、页面标题、头像说明和无障碍标签均支持中英切换；“无损平方”英文统一为 `Square`。QQ 按“不对外公开”处理，StrikeBounce 保持不可点击，博客入口已删除。

| 内容 | 配置位置 |
| --- | --- |
| 姓名、别名及顺序 | `name` / `aliases`；分别填写 `zh`、`en` |
| 首页短句、个人技术、学习方向 | `tagline` / `intro` / `learning` |
| 关于页独立引言 | `aboutTagline` |
| 常用技术 | `technologies` |
| 兴趣、公开留言说明 | `interests` / `questions` |
| 性格侧写 | `personality.description.zh` |
| 性格标题、侧写下方的小号斜体文字 | `personality.type` / `personality.notice.zh` |
| 人格分数 | `personality.dimensions[].value`；`pole: "left"` 表示左侧倾向，其余为右侧。标记位置会自动计算 |
| 六项技能名称、分数、短句 | `skills[].name` / `value` / `description` |
| 雷达图轴名 | `skills[].short`；图形由 JavaScript 根据同一组技能数值生成 |
| 团队称呼、划掉的头衔、角色 | `experience[]` |
| 中二病调侃、虚构公司、结语 | `experienceJoke` |
| 中英引文 | `poem.zh` / `poem.en`；显示在关于页底部 |
| 赞助及公开联系方式 | `sponsorUrl` / `socials[]` |
| 两个网站及友链 | `websites` / `friends` |
| 音乐文件、歌名、歌手 | `music` |

项目标签支持 `label: 'new'`、`'hot'`、`'legacy'`；也支持 `tags: ['new', 'hot']`。目前 ScreenShotPlus 为“新”、StrikeSense 为“热”、OpenDear 为“遗产”。搜索支持项目名称、中英描述，能与分类、标签一起筛选。

本次文字与数值依据：2026-10-14 用户给出的文字、四张截图及后续修正。人格数值为 84 / 67 / 62 / 88 / 83；技能数值为 58 / 72 / 25 / 30 / 76 / 64。用户要求统一蓝色，所有人格条、技能条及雷达点保持同一蓝色。技能短句按用户要求改成自然的第一人称口吻。

姓名“柠萌小芹菜”由用户明确确认；INFP 与首页三项身份沿用上次用户授权询问 ChatGPT 后的资料。头像、现有七个项目及下载线路、Discord 社区、Bilibili UID 和音乐文件仍使用本仓库已有内容。

遥汐的头像保存为 `images/friends/yaoxi.jpg`，来自先前直接下载的 `https://cdn.kldhsh.top/file/kldhsh.jpg`，无需运行时请求原站。

站内点击四页导航、浏览器后退与前进采用局部页面切换，保留同一个音频元素和播放位置。刷新、关闭标签页或跳转到外部网站会开始新的页面生命周期。
