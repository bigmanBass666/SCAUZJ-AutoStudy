@echo off
chcp 65001 >nul
echo ========================================
echo 启动 Chrome 并开放 CDP 调试端口
echo ========================================
echo.

REM 检查 Chrome 是否已安装
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else (
    echo 未找到 Chrome 安装路径，请手动修改脚本
    pause
    exit /b 1
)

REM 创建调试配置文件目录（如果不存在）
if not exist "%USERPROFILE%\chrome-debug-profile" (
    mkdir "%USERPROFILE%\chrome-debug-profile"
)

echo 正在启动 Chrome...
echo 调试端口: 9222
echo 用户数据目录: %USERPROFILE%\chrome-debug-profile
echo.
echo 请在弹出的 Chrome 窗口中手动登录 z.ai 或相关网站
echo 登录完成后，按任意键关闭此窗口（Chrome 会继续运行）
echo.

start "" %CHROME_PATH% --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\chrome-debug-profile"

timeout /t 5 /nobreak >nul
echo Chrome 已启动
echo.
echo 下一步操作：
echo 1. 在新打开的 Chrome 窗口中访问 https://z.ai 并登录
echo 2. 登录成功后，返回 Claude Code 使用 playwright 工具
echo.
pause
