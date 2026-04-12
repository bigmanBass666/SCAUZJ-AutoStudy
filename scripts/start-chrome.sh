#!/bin/bash

echo "========================================"
echo "启动 Chrome 并开放 CDP 调试端口"
echo "========================================"
echo ""

# 检测操作系统和 Chrome 路径
if [ -d "/Applications/Google Chrome.app" ]; then
    CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    PROFILE_DIR="$HOME/chrome-debug-profile"
elif [ -d "/Applications/Chromium.app" ]; then
    CHROME_PATH="/Applications/Chromium.app/Contents/MacOS/Chromium"
    PROFILE_DIR="$HOME/chrome-debug-profile"
else
    echo "未找到 Chrome/Chromium 安装路径"
    exit 1
fi

# 创建调试配置文件目录（如果不存在）
mkdir -p "$PROFILE_DIR"

echo "正在启动 Chrome..."
echo "调试端口: 9222"
echo "用户数据目录: $PROFILE_DIR"
echo ""
echo "请在弹出的 Chrome 窗口中手动登录 z.ai 或相关网站"
echo "登录完成后，按 Ctrl+C 或关闭此终端（Chrome 会继续运行）"
echo ""

# 启动 Chrome
"$CHROME_PATH" \
    --remote-debugging-port=9222 \
    --user-data-dir="$PROFILE_DIR" \
    2>/dev/null &

sleep 3
echo "Chrome 已启动"
echo ""
echo "下一步操作："
echo "1. 在新打开的 Chrome 窗口中访问 https://z.ai 并登录"
echo "2. 登录成功后，返回 Claude Code 使用 playwright 工具"
echo ""
