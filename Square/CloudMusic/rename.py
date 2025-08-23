import os

# 获取当前目录
current_dir = os.getcwd()

# 遍历当前目录下的所有文件
for filename in os.listdir(current_dir):
    # 构造完整路径
    old_path = os.path.join(current_dir, filename)

    # 如果是文件且文件名中包含空格
    if os.path.isfile(old_path) and ' ' in filename:
        # 替换空格为下划线
        new_filename = filename.replace(' ', '_')
        new_path = os.path.join(current_dir, new_filename)

        # 重命名文件
        os.rename(old_path, new_path)
        print(f"重命名: {filename} → {new_filename}")
