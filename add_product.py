import uuid

def generate_product_configs():
    print("=" * 50)
    print("      Lossless Square 产品配置自动生成脚本")
    print("=" * 50)

    # 1. 基础信息收集
    prod_name = input("请输入产品名称 (例如: CCD Manager): ").strip()
    prod_desc = input("请输入产品一句话描述 (例如: 极致优化，不容失误): ").strip()
    
    # 自动生成一个不重复的唯一 ID，防止和你以后加的其他产品冲突
    card_id = f"prod-{uuid.uuid4().hex[:8]}-card"
    
    print("\n[选择产品点击行为]")
    print("1. 点击直接跳转外部网页链接 (如 GitHub Pages 站点)")
    print("2. 点击弹出下载线路选择窗 (如 蓝奏云/百度网盘/GitHub Release)")
    behavior_type = input("请选择行为序号 (1 或 2): ").strip()

    # 2. 根据行为渲染 HTML 和 JS
    if behavior_type == "1":
        target_url = input("请输入要跳转的外部网页链接 (URL): ").strip()
        img_path = input("请输入展示图片路径 (默认: images/default.png): ").strip() or "images/default.png"
        
        # 生成 HTML
        html_code = f"""<div class="product-card" data-type="link" data-target="{target_url}">
    <div class="prod-img-wrapper">
        <img src="{img_path}" alt="{prod_name}">
    </div>
    <div class="prod-details">
        <h3>{prod_name}</h3>
        <p>{prod_desc}</p>
        <span class="action-tag text-link">访问站点 →</span>
    </div>
</div>"""

        print("\n" + "="*20 + " 成功生成 HTML 片段 " + "="*20)
        print("请将以下代码粘贴到 index.html 的 <main class=\"product-grid\"> 内部：\n")
        print(html_code)
        print("\n" + "="*50)
        print("提示：此产品为直接跳转类型，不需要在 script.js 中添加任何配置！")
        print("=" * 50)

    elif behavior_type == "2":
        img_path = input("请输入展示图片路径 (默认: images/default.png): ").strip() or "images/default.png"
        
        routes = []
        print("\n--- 开始配置下载路线 (输入 q 结束配置路线) ---")
        while True:
            route_name = input("\n[路线名称] (例如: 蓝奏云 高速 / GitHub 节点): ").strip()
            if route_name.lower() == 'q':
                break
            route_url = input("[路线链接] (URL): ").strip()
            route_pwd = input("[路线密码] (如果没有密码请直接回车留空): ").strip()
            route_avail = input("[是否可用] (1 表示可用/ONLINE，0 表示维护中/OFFLINE): ").strip()
            
            # 默认高可用
            avail_status = 1 if route_avail != '0' else 0
            
            route_item = {
                "name": route_name,
                "url": route_url,
                "available": avail_status
            }
            if route_pwd:
                route_item["password"] = route_pwd
                
            routes.append(route_item)
            
            choice = input("是否继续添加下一条下载路线？(y/n): ").strip().lower()
            if choice == 'n':
                break

        # 生成 HTML
        html_code = f"""<div class="product-card" id="{card_id}" data-type="download">
    <div class="prod-img-wrapper">
        <img src="{img_path}" alt="{prod_name}">
    </div>
    <div class="prod-details">
        <h3>{prod_name}</h3>
        <p>{prod_desc}</p>
        <span class="action-tag text-download">获取下载 ↓</span>
    </div>
</div>"""

        # 生成 JS
        import json
        js_data = {
            "name": prod_name,
            "routes": routes
        }
        # 将 python 字典转为漂亮的 JS 对象字符串格式
        js_code_formatted = json.dumps(js_data, ensure_ascii=False, indent=16)
        # 微调格式对齐
        js_code_output = f'"{card_id}": {js_code_formatted.strip()}'

        print("\n" + "="*20 + " 步骤 1：生成 HTML 片段 " + "="*20)
        print("请将以下代码粘贴到 index.html 的 <main class=\"product-grid\"> 内部：\n")
        print(html_code)
        
        print("\n" + "="*20 + " 步骤 2：生成 JS 数据库配置 " + "="*20)
        print("请将以下代码粘贴到 script.js 的 `const productsDatabase = {` 内部（注意逗号分隔）：\n")
        print(js_code_output + ",")
        print("\n" + "="*50)

    else:
        print("输入错误，脚本已退出。")

if __name__ == "__main__":
    generate_product_configs()