"""Generate a project entry for site-config.js without changing website files."""
import json
import re
import uuid
from pathlib import Path
from urllib.parse import urlparse


def ask(prompt, default=""):
    value = input(prompt).strip()
    return value or default


def ask_choice(prompt, choices, default):
    while True:
        value = ask(prompt, default)
        if value in choices:
            return value
        print("可选值：" + ", ".join(choices))


def ask_url(prompt):
    while True:
        value = ask(prompt)
        parsed = urlparse(value)
        if parsed.scheme == "https" and parsed.netloc:
            return value
        print("请输入完整的 HTTPS 地址。")


def bilingual(prompt):
    zh = ask(prompt + "（中文）: ")
    en = ask(prompt + "（英文；暂缺可留空）: ")
    # Missing English falls back to Chinese rather than inventing a translation.
    return {"zh": zh, "en": en or zh}


def main():
    print("生成项目配置，审核后粘贴到 site-config.js 的 projects 数组。")
    name = ask("项目名称: ")
    if not name:
        raise SystemExit("项目名称不能为空。")
    default_id = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "project-" + uuid.uuid4().hex[:8]
    project = {"id": ask("项目 ID（回车使用默认）: ", default_id), "name": name}
    project["category"] = ask_choice("分类 desktop / games / music [desktop]: ", ["desktop", "games", "music"], "desktop")
    label = ask_choice("标签 new / hot / legacy / none [none]: ", ["new", "hot", "legacy", "none"], "none")
    if label != "none":
        project["label"] = label
    image = ask("本地封面路径（如 images/product/my-app.svg）: ")
    image_path = (Path(__file__).parent / image).resolve()
    root_path = Path(__file__).parent.resolve()
    if not image or not image_path.is_relative_to(root_path) or not image_path.is_file():
        raise SystemExit("封面必须是仓库内已有的文件。先添加封面再运行。")
    project["image"] = image_path.relative_to(root_path).as_posix()
    project["description"] = bilingual("项目描述")
    behavior = ask_choice("入口 link / download [link]: ", ["link", "download"], "link")
    if behavior == "link":
        project["url"] = ask_url("项目网址: ")
    else:
        project["routes"] = []
        while True:
            route = {"name": bilingual("下载来源名称"), "url": ask_url("下载来源网址: ")}
            password = ask("提取码（没有则留空）: ")
            if password:
                route["password"] = password
            project["routes"].append(route)
            if ask_choice("继续添加下载来源 y / n [n]: ", ["y", "n"], "n") == "n":
                break
    print("\n粘贴以下对象到 projects 数组，并确认名称、能力和链接：\n")
    print(json.dumps(project, ensure_ascii=False, indent=2) + ",")


if __name__ == "__main__":
    main()
