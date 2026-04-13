#!/usr/bin/env python3
"""
按原图分类整理验证码图片
每个原图一个文件夹，内含该图片的各种阈值版本
"""

import os
import shutil
from pathlib import Path

INPUT_DIR = './captcha_preprocessed'
OUTPUT_DIR = './captcha_compare'

# 创建输出根目录
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 获取所有原图
originals = sorted(Path(INPUT_DIR).glob('*_orig.png'))
print(f'[1] 找到 {len(originals)} 张原图')

for orig_path in originals:
    # 提取基础名称：captcha_001_20260411_230108_630484
    base_name = orig_path.name.replace('_orig.png', '')
    img_dir = Path(OUTPUT_DIR) / base_name
    img_dir.mkdir(parents=True, exist_ok=True)

    # 复制原图
    shutil.copy(orig_path, img_dir / orig_path.name)

    # 复制该图片的所有阈值版本
    pattern = f'{base_name}_thresh*.png'
    thresh_files = sorted(Path(INPUT_DIR).glob(pattern))
    for f in thresh_files:
        shutil.copy(f, img_dir / f.name)

    print(f'    ✓ {base_name}: 1 原图 + {len(thresh_files)} 阈值版')

print(f'\n✅ 整理完成！')
print(f'   根目录: {OUTPUT_DIR}')
print(f'   每个子文件夹包含:')
print(f'     - xxx_orig.png (原始图片)')
print(f'     - xxx_thresh100.png ... xxx_thresh160.png (各阈值版本)')
print(f'\n请进入各文件夹对比同一张图的效果！')
