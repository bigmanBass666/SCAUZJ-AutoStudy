#!/usr/bin/env python3
"""
验证码图片预处理 - 多阈值对比
读取 captcha_dataset 中的图片，用不同阈值二值化，保存对比图
"""

import os
import cv2
import numpy as np
from pathlib import Path

# 配置
INPUT_DIR = './captcha_dataset'
OUTPUT_DIR = './captcha_preprocessed'
THRESHOLDS = [100, 110, 120, 130, 140, 150, 160]  # 测试的阈值

# 创建输出目录
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 获取前10张图片
image_files = sorted(Path(INPUT_DIR).glob('*.png'))[:10]
print(f'[1] 选取 {len(image_files)} 张图片进行处理')

for img_path in image_files:
    img_name = img_path.stem
    print(f'\n[2] 处理: {img_name}')

    # 读取图片（灰度模式）
    img = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        print(f'    ❌ 无法读取: {img_path}')
        continue

    # 保存原图
    orig_path = Path(OUTPUT_DIR) / f'{img_name}_orig.png'
    cv2.imwrite(str(orig_path), img)

    # 对不同阈值进行二值化
    for thresh in THRESHOLDS:
        # 二值化
        _, binary = cv2.threshold(img, thresh, 255, cv2.THRESH_BINARY)

        # 去噪：使用形态学操作去除孤立点
        kernel = np.ones((2, 2), np.uint8)
        # 开运算：先腐蚀后膨胀，去除小噪点
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

        # 保存
        out_path = Path(OUTPUT_DIR) / f'{img_name}_thresh{thresh}.png'
        cv2.imwrite(str(out_path), cleaned)

        print(f'    ✅ 阈值 {thresh}: {out_path.name}')

print(f'\n✅ 全部完成！处理结果保存在: {OUTPUT_DIR}')
print(f'   原图命名: xxx_orig.png')
print(f'   处理图: xxx_thresh{THRESHOLDS[0]}.png ... xxx_thresh{THRESHOLDS[-1]}.png')
