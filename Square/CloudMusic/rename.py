import os
import re

# 清理文件名函数
def clean_filename(name):
    # 删除空格
    name = name.replace(' ', '')
    # 移除特殊符号（包括中英文括号、引号、标点等）
    name = re.sub(r'[()

\[\]

{}\'"@、。！？：；]', '', name)
    return name

# 扫描并重命名文件（当前目录）
def rename_files(directory='.'):
    for filename in os.listdir(directory):
        full_path = os.path.join(directory, filename)
        if os.path.isfile(full_path):
            new_name = clean_filename(filename)
            if new_name != filename:
                new_path = os.path.join(directory, new_name)
                os.rename(full_path, new_path)
                print(f"重命名: {filename} → {new_name}")

rename_files()
