import uuid
import json

def generate_product_configs():
    print("=" * 50)
    print("    Lossless Square 产品配置自动生成脚本 (升级版)")
    print("=" * 50)

    # 1. 基础信息收集
    prod_name = input("请输入产品名称: ").strip()
    prod_desc = input("请输入产品描述: ").strip()
    
    # 新增：标签选择
    print("\n[产品标签]")
    print("可选标签: hot (热), new (新), legacy (旧), none (无)")
    label = input("请输入标签 (默认 none): ").strip() or "none"
    
    card_id = f"prod-{uuid.uuid4().hex[:8]}-card"
    
    print("\n[选择产品点击行为]")
    print("1. 点击直接跳转外部网页链接")
    print("2. 点击弹出下载线路选择窗")
    behavior_type = input("请选择 (1 或 2): ").strip()

    # 2. 生成 HTML 通用属性
    data_attr = f'data-label="{label}"' if label != "none" else ""

    if behavior_type == "1":
        target_url = input("请输入跳转链接: ").strip()
        img_path = input("请输入展示图片路径: ").strip() or "images/default.png"
        
        html_code = f"""<div class="product-card" {data_attr} data-type="link" data-target="{target_url}">
    <div class="prod-img-wrapper">
        <img src="{img_path}" alt="{prod_name}">
    </div>
    <div class="prod-details">
        <h3>{prod_name} {f'<span class="tag {label}">{label.upper()}</span>' if label != 'none' else ''}</h3>
        <p>{prod_desc}</p>
        <span class="action-tag text-link">访问站点 →</span>
    </div>
</div>"""
        print_result(html_code, None)

    elif behavior_type == "2":
        img_path = input("请输入展示图片路径: ").strip() or "images/default.png"
        routes = []
        while True:
            r_name = input("\n[路线名称] (q 结束): ").strip()
            if r_name.lower() == 'q': break
            r_url = input("[路线链接]: ").strip()
            r_pwd = input("[路线密码] (留空跳过): ").strip()
            r_avail = input("[是否可用] (1/0): ").strip()
            
            item = {"name": r_name, "url": r_url, "available": int(r_avail or 1)}
            if r_pwd: item["password"] = r_pwd
            routes.append(item)
            if input("继续添加? (y/n): ").lower() == 'n': break

        html_code = f"""<div class="product-card" id="{card_id}" {data_attr} data-type="download">
    <div class="prod-img-wrapper">
        <img src="{img_path}" alt="{prod_name}">
    </div>
    <div class="prod-details">
        <h3>{prod_name} {f'<span class="tag {label}">{label.upper()}</span>' if label != 'none' else ''}</h3>
        <p>{prod_desc}</p>
        <span class="action-tag text-download">获取下载 ↓</span>
    </div>
</div>"""
        
        js_data = {"name": prod_name, "routes": routes}
        js_output = f'"{card_id}": {json.dumps(js_data, ensure_ascii=False, indent=12)}'
        print_result(html_code, js_output)

def print_result(html, js):
    print("\n" + "="*20 + " 成功生成 " + "="*20)
    print("【HTML 代码】 (请粘贴到 <main class=\"product-grid\">):")
    print(html)
    if js:
        print("\n【JS 配置】 (请粘贴到 script.js 的 productsDatabase 中):")
        print(js + ",")
    print("=" * 50)

if __name__ == "__main__":
    generate_product_configs()