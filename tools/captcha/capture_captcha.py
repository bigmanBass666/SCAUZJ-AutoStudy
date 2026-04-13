#!/usr/bin/env python3
"""
爬取验证码图片脚本
目标：https://scauzj.leykeji.com/user/login
方法：访问登录页，下载 /service/code 验证码图片 20 张
"""

import requests
import time
import os
from datetime import datetime

# 配置
BASE_URL = 'https://scauzj.leykeji.com'
CAPTCHA_URL = f'{BASE_URL}/service/code'
OUTPUT_DIR = './captcha_dataset'
TOTAL = 20

# 创建输出目录
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 使用 Session 保持 Cookie
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
})

# 1. 先访问登录页获取初始 Cookie
print('[1] 访问登录页获取会话...')
resp = session.get(f'{BASE_URL}/user/login', verify=False)
print(f'    状态码: {resp.status_code}')
print(f'    Cookie: {session.cookies.get_dict()}')

# 2. 循环下载验证码
print(f'\n[2] 开始下载 {TOTAL} 张验证码...')
for i in range(1, TOTAL + 1):
    try:
        # 添加随机参数避免缓存
        params = {'r': str(int(time.time() * 1000))}
        resp = session.get(CAPTCHA_URL, params=params, verify=False)

        if resp.status_code == 200:
            # 保存文件
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
            filename = f'{OUTPUT_DIR}/captcha_{i:03d}_{timestamp}.png'
            with open(filename, 'wb') as f:
                f.write(resp.content)
            print(f'    ✅ 保存: {filename}')
            time.sleep(0.5)  # 间隔500ms，避免触发限流
        else:
            print(f'    ❌ 第{i}张下载失败: HTTP {resp.status_code}')

    except Exception as e:
        print(f'    ❌ 第{i}张异常: {e}')

print(f'\n✅ 完成！文件保存在: {OUTPUT_DIR}')
print(f'    共尝试 {TOTAL} 次，请检查实际下载数量')
