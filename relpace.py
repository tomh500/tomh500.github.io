import re

# 定义颜色到变量的映射表（根据你的需求）
color_map = {
    "#060913": "var(--bg-color)",
    "#0f172a": "var(--bg-color)", # 对应深色
    "rgba(10, 16, 32, 0.85)": "var(--panel-bg)",
    "#ffffff": "var(--text-main)",
    "#8892b0": "var(--text-sub)",
    "#00f3ff": "var(--accent)",
    "#1e293b": "var(--card-border)",
    "#ff007f": "var(--neon-pink)"
}

def convert_css(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 循环替换
    for color, var in color_map.items():
        content = content.replace(color, var)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"转换完成！已生成: {output_file}")

convert_css('style.css', 'style_o.css')