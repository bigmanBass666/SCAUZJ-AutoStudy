#!/usr/bin/env python3
"""
按阈值整理验证码图片
将 preprocessed 目录里的文件按阈值分类到不同文件夹
"""

import os
import shutil
from pathlib import Path

INPUT_DIR = './captcha_preprocessed'
OUTPUT_DIR = './captcha_by_threshold'

# 创建输出根目录
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 收集所有原图（不处理）
originals = sorted(Path(INPUT_DIR).glob('*_orig.png'))
if originals:
    orig_dir = Path(OUTPUT_DIR) / 'originals'
    orig_dir.mkdir(parents=True, exist_ok=True)
    for f in originals:
        shutil.copy(f, orig_dir / f.name)
    print(f'[1] 原图: {len(originals)} 张 → {orig_dir}')

# 收集各阈值图片
thresholds = [100, 110, 120, 130, 140, 150, 160]
for thresh in thresholds:
    pattern = f'*_thresh{thresh}.png'
    files = sorted(Path(INPUT_DIR).glob(pattern))
    if files:
        thresh_dir = Path(OUTPUT_DIR) / f'thresh_{thresh}'
        thresh_dir.mkdir(parents=True, exist_ok=True)
        for f in files:
            shutil.copy(f, thresh_dir / f.name)
        print(f'[{thresh}] 阈值 {thresh}: {len(files)} 张 → {thresh_dir}')

print(f'\n✅ 整理完成！')
print(f'   根目录: {OUTPUT_DIR}')
print(f'   子目录:')
print(f'     - originals/ (原始图片)')
for t in thresholds:
    print(f'     - thresh_{t}/ (阈值 {t})')
