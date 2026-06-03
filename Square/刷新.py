import os

# 支持的音频格式
AUDIO_EXTENSIONS = ('.mp3', '.flac', '.wav', '.ogg')

# 文件夹和输出路径
music_folder = 'CloudMusic'
output_file = 'MusicList.txt'
base_url = 'https://tomh500.github.io/Square/CloudMusic/'

# 获取并排序音频文件
music_files = sorted([
    f for f in os.listdir(music_folder)
    if f.lower().endswith(AUDIO_EXTENSIONS)
])

# 写入 MusicList.txt
with open(output_file, 'w', encoding='utf-8') as f:
    for idx, filename in enumerate(music_files, start=1):
        name = os.path.splitext(filename)[0]
        mode = 'hide' if 'cfgsong' in name.lower().replace('_', '') else 'normal'
        f.write(f"{idx}:\n")
        f.write(f"- {name}\n")
        f.write(f"- {base_url}{filename}\n")
        f.write(f"- {mode}\n\n")

print(f"已生成新的 {output_file}，共包含 {len(music_files)} 首曲目。")
