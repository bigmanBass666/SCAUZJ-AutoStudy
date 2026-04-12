# MCP CDP Eval Server

为 Playwright MCP 提供 JS 代码执行能力的补充服务器。

## 功能

通过 Chrome DevTools Protocol (CDP) 在浏览器页面中执行任意 JavaScript 代码，返回结果。

## 工具

- `mcp__cdp-eval__eval` - 执行 JS 代码
  - 参数：`code` (string) - 要执行的 JavaScript 代码
  - 返回：执行结果（字符串）

## 安装

```bash
cd mcp-cdp-eval
npm install
```

## 配置

在项目级 `.claude/settings.json` 中添加：

```json
{
  "mcpServers": {
    "cdp-eval": {
      "command": "node",
      "args": ["D:/Working/programming_projects/leykeji-autostudy/mcp-cdp-eval/index.js"]
    }
  }
}
```

## 使用示例

```javascript
// 1. 读取页面标题
mcp__cdp-eval__eval → code: "document.title"

// 2. 注入 GM Mock
mcp__cdp-eval__eval → code: "粘贴 gm-mock.js 的全部内容"

// 3. 注入主脚本
mcp__cdp-eval__eval → code: "粘贴 main.js 的全部内容"

// 4. 读取测试结果
mcp__cdp-eval__eval → code: "JSON.stringify(window.__TEST_RESULTS__)"

// 5. 截图（通过 Playwright）
mcp__playwright__browser_take_screenshot → element: "full"
```

## 前置条件

- Chrome 浏览器必须已启动并通过 `--remote-debugging-port=9222` 启动
- Playwright 启动浏览器时需指定 debugging port

## 原理

1. 连接到 `http://localhost:9222/json` 获取可用的浏览器标签页
2. 建立 WebSocket 连接到页面的 `webSocketDebuggerUrl`
3. 使用 CDP `Runtime.evaluate` 方法执行代码
4. 返回执行结果
