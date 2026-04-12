# Playwright MCP 与 z.ai 求助协议配置说明

## 概述

本配置实现了 Claude Code 通过 Playwright MCP 连接已登录的 Chrome 浏览器，从而在需要时自动向 z.ai (Claude) 求助的功能。

## 快速开始

### 1. 启动 Chrome 调试实例

**Windows:**
```cmd
scripts\start-chrome.bat
```

**macOS/Linux:**
```bash
./scripts/start-chrome.sh
```

### 2. 手动登录

1. 在新打开的 Chrome 窗口中访问 https://z.ai
2. 使用你的账号登录 z.ai
3. 确保登录状态保持（不要关闭窗口）

### 3. 使用 Playwright MCP

当 Claude 遇到困难需要求助时，它会自动：
- 连接到 localhost:9222 的 Chrome 实例
- 导航到 z.ai 发送问题
- 等待并提取回复
- 基于回复继续工作

## 配置文件说明

### `.claude/settings.json`
项目级 Claude Code 配置，定义了 MCP 服务器连接方式：

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--connect-to-browser",
        "http://localhost:9222"
      ]
    }
  }
}
```

**关键参数：**
- `--connect-to-browser`: 连接已存在的 Chrome 实例（保持登录态）
- `http://localhost:9222`: Chrome 远程调试端口

### 启动脚本

#### `scripts/start-chrome.bat` (Windows)
- 自动检测 Chrome 安装路径
- 使用独立的用户数据目录（`%USERPROFILE%\chrome-debug-profile`）
- 避免干扰日常使用的 Chrome

#### `scripts/start-chrome.sh` (macOS/Linux)
- 支持 Chrome 和 Chromium
- 使用 `$HOME/chrome-debug-profile`

## 求助协议工作流程

详见 `CLAUDE.md` 中的“🔁 求助协议”部分，核心流程：

1. **问题构造** - 压缩问题到最精简描述
2. **导航** - browser_navigate → https://z.ai
3. **输入** - 使用 contenteditable 选择器定位输入框
4. **发送** - 点击发送按钮
5. **等待** - 检测“停止生成”按钮消失
6. **提取** - 从 assistant 消息区域提取回复
7. **使用** - 基于回复继续工作

## 故障排除

### MCP 连接失败

**症状：** `Connection refused` 或 `Failed to connect to browser`

**解决：**
1. 确认 Chrome 已启动且包含 `--remote-debugging-port=9222` 参数
2. 访问 http://localhost:9222/json 检查是否有响应
3. 检查是否有其他程序占用了 9222 端口

### 登录态丢失

**症状：** z.ai 显示登录页面而非对话界面

**解决：**
1. 关闭当前调试 Chrome 窗口
2. 重启时确保使用了独立的 user-data-dir
3. 重新登录 z.ai
4. 注意定期登录（会话可能过期）

### DOM 选择器失效

**症状：** 无法找到输入框或发送按钮

**解决：**
1. z.ai 网站改版可能导致选择器失效
2. Claude 会自动使用 browser_snapshot 检测当前结构
3. 在可能出现问题时，让 Claude 重新分析页面

## 安全注意事项

- **仅限个人使用**：不要在生产环境或共享计算机上使用此配置
- **登录态风险**：调试端口 9222 可以被同一网络的其他程序访问，确保网络安全
- **隐私**：Chrome 调试会话包含你的登录 cookies，确保只有你控制的程序可以访问 localhost:9222

## 最佳实践

1. **启动顺序**：先启动 Chrome 并登录，再开始 Claude Code 工作
2. **保持窗口**：不要关闭调试 Chrome 窗口，可最小化到后台
3. **定期检查**：如果长时间未使用，z.ai 会话可能过期，需要重新登录
4. **限制使用**：仅当真正需要时才触发求助协议，避免滥用

## 技术说明

- Playwright MCP 使用 Chrome DevTools Protocol (CDP) 连接浏览器
- 使用 `--connect-to-browser` 而非 `--launch-browser` 保持登录状态
- 会话隔离：调试实例使用独立的 user-data-dir，不影响日常浏览
- 选择器策略：优先使用语义化属性（aria-label, data-testid），次选 class 名
