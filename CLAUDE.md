- 第一件事: 阅读 ./声明.md
- 每一个任务完成后进行git提交

账号: REDACTED_USERNAME
密码: REDACTED_PASSWORD

视频页面示例: <https://scauzj.leykeji.com/user/node?nodeId=1429487>

---

## ⚠️ Playwright MCP 调用规范（极易出错）

### browser_evaluate 参数格式

**绝对禁止**把代码直接作为 `arguments` 传递（Claude 常见臭虫）。

❌ **错误写法**（会导致 `expected string, received undefined`）：
```
mcp__playwright__browser_evaluate
{ "script": "document.title" }
```
*(Claude 实际发送：`{"arguments": "document.title"}`)*

✅ **正确写法**：
每次调用时，确保 `arguments` 是包含 `script` 键的 JSON 对象：

```javascript
// 正确格式（示例）
{
  "name": "browser_evaluate",
  "arguments": {
    "script": "document.title"
  }
}
```

**关键检查**：如果你看到错误 `expected string, received undefined`，99% 是 arguments 不是对象。
