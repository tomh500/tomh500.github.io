import os

# 获取当前目录下所有文件
files = os.listdir()

for file in files:
    # 如果文件名中有空格
    if ' ' in file:
        new_name = file.replace(' ', '')  # 去掉文件名中的空格
        os.rename(file, new_name)  # 重命名文件

print("所有文件名中的空格已删除。")
