# 🐛 Playwright MCP JS 执行问题报告

**日期**：2026-04-12
**状态**：工具可用性确认失败
**问题**：`browser_evaluate` 工具调用参数解析失败

---

## 1. 问题描述

在 Playwright MCP 会话中，尝试使用 `browser_evaluate` 工具执行 JavaScript 代码时，工具返回参数类型错误，即使传递了正确的 `code` 参数，仍然报错 `received undefined`。

实测表明 `browser_evaluate` **无法正常接收代码并执行**，导致无法实现直接注入测试流程。

---

## 2. 环境信息

- **Claude Code CLI**: Opus 4.6 (claude-opus-4-6)
- **操作系统**: Windows 10 (MSYS, win32)
- **工作目录**: `D:\Working\programming_projects\leykeji-autostudy`
- **Playwright MCP**: `@playwright/mcp@latest`
- **目标浏览器**: Chrome (通过 Playwright 启动)
- **当前页面**: `https://scauzj.leykeji.com/user/node?nodeId=1429487`

---

## 3. 完整重现步骤

### Step 1: 确认会话状态

```bash
# 在 Claude Code 中执行
# MCP 显示: playwright · ✔ connected
```

### Step 2: 导航到测试页面

```bash
mcp__playwright__browser_navigate
{ "url": "https://scauzj.leykeji.com/user/node?nodeId=1429487" }
```

**结果**：✅ 页面正常加载

### Step 3: 尝试执行简单表达式

```bash
mcp__playwright__browser_evaluate
{ "code": "document.title" }
```

**预期结果**：
```
"会员中心-乐益科技"
```

**实际结果**：
```
Error: {
  "expected": "string",
  "code": "invalid_type",
  "path": ["function"],
  "message": "Invalid input: expected string, received undefined"
}
```

### Step 4: 验证其他工具正常

```bash
mcp__playwright__browser_snapshot  # ✅ 正常返回页面快照
mcp__playwright__browser_console_messages  # ✅ 正常返回日志
mcp__playwright__browser_click  # ✅ 正常点击
```

**结论**：其他工具均可正常调用，只有 `browser_evaluate` 参数解析异常。

---

## 4. 详细错误日志

```json
{
  "expected": "string",
  "code": "invalid_type",
  "path": ["function"],
  "message": "Invalid input: expected string, received undefined"
}
```

**解读**：
- MCP 服务器期望收到一个 `string` 类型参数
- `path: ["function"]` 表示解析失败发生在参数结构的某个"函数"字段上
- `received undefined` 说明实际传入的值是 `undefined`

**可能的根因**：
1. `browser_evaluate` 工具的参数模式（schema）期望的参数名不是 `code`
2. 工具虽然存在，但 schema 定义与调用方式不匹配
3. MCP 工具注册时参数结构错误

---

## 5. 工具参数模式猜测

根据错误信息，工具期望的可能是以下某种结构：

### 猜测 A：参数名是 `expression` 而不是 `code`

```bash
# 尝试
mcp__playwright__browser_evaluate
{ "expression": "document.title" }
```

**状态**：尚未测试（需要用户验证）

### 猜测 B：需要嵌套结构

```bash
# 尝试
mcp__playwright__browser_evaluate
{ "arguments": { "code": "document.title" } }
```

### 猜测 C：工具未正确注册

工具名可能是 `browser_execute_code` 或其他变体，需要查看 `.claude/settings.json` 中的 MCP 工具清单确认。

---

## 6. 替代方案（不依赖 browser_evaluate）

如果 `browser_evaluate` 无法修复，可以考虑：

### 方案 1: 使用引导脚本 + WebSocket 热更新
- 创建引导脚本一次性安装到 Tampermonkey
- 使用 `@require` 指向本地服务器
- AI 直接修改 `main.js` 文件，刷新页面即可生效
- **优点**：完全真实环境，无需代码注入工具
- **缺点**：需要本地服务器和一次手动安装

### 方案 2: 手动测试流程
- 用户手动在控制台粘贴执行代码
- AI 通过 `browser_console_messages` 和 `browser_screenshot` 观察结果
- **优点**：立即可行
- **缺点**：需要用户手动操作

---

## 7. 需要调试的信息

要彻底解决此问题，需要获取：

1. **完整工具清单及参数模式**：
   ```bash
   # 如何获取？
   # 可能需要查看 Claude Code 的工具注册日志
   ```

2. **Playwright MCP 服务器的源代码**：
   - 查找 `@playwright/mcp` 包中 `browser_evaluate` 工具的定义
   - 确认参数名到底是 `code`、`expression` 还是其他

3. **Claude CLI 的工具发现机制**：
   - `.claude/settings.json` 中的配置是否影响工具参数？

---

## 8. 待验证的假设

| 假设 | 验证方法 | 状态 |
|------|----------|------|
| 参数名是 `expression` 而不是 `code` | 尝试 `{ "expression": "..." }` | ⏳ |
| 参数需要嵌套在 `arguments` 中 | 尝试 `{ "arguments": { ... } }` | ⏳ |
| 工具名是 `browser_execute_code` | 尝试调用该名称 | ⏳ |
| 需要 JavaScript 上下文隔离配置 | 查看 MCP 文档 | ⏳ |

---

## 9. 临时工作流建议（当前可用）

在工具问题解决前，建议采用：

```
1. AI 修改 docs/hot_reload/main.js
2. 用户在浏览器控制台手动粘贴执行 gm-mock.js 和 main.js
3. 用户观察控制台输出并截图
4. AI 根据结果继续修改
```

---

## 10. 关键文件位置

- 主脚本：`docs/hot_reload/main.js`
- GM Mock：`docs/hot_reload/gm-mock.js`
- 测试套件：`docs/hot_reload/test-runner.js`
- 教程：`docs/hot_reload/tempermonkey_hot_reload_tutorial.md`
- 实践记录：`docs/hot_reload/实践报告-自动注入测试的真实情况.md`

---

**请求**：
请检查 `@playwright/mcp` 的实际工具定义，或提供可用的工具清单及参数模式，以便正确调用 `browser_evaluate`。
