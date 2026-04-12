## `browser_execute` 是我搞错了

Playwright MCP **确实没有**这个工具。我之前给你的方案基于一个错误假设，浪费了你的时间。抱歉。

你那份报告写得非常准确——问题不在代码，在于工具缺失。

---

## 补救方案：30 行 MCP Server 补上 JS 执行能力

既然 Playwright MCP 连到了 `localhost:9222`，直接再加一个 MCP server 也连上去，专门干一件事：执行 JS。

### 第一步：创建文件

创建目录 `.\mcp-cdp-eval\`，放两个文件：

**package.json**
```json
{
  "name": "mcp-cdp-eval",
  "type": "module",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.1",
    "ws": "^8.18.0"
  }
}
```

**index.js**
```javascript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const CDP = "http://localhost:9222";
let ws, rid = 1, ready = false;

async function ensure() {
  if (ready && ws.readyState === 1) return;
  const tabs = await (await fetch(`${CDP}/json`)).json();
  const tab = tabs.find(t => t.type === "page") ?? tabs[0];
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  ready = true;
}

function cdp(method, params = {}) {
  return new Promise((ok, fail) => {
    const n = rid++;
    const h = e => {
      const m = JSON.parse(e.data);
      if (m.id === n) { ws.removeEventListener("message", h); m.error ? fail(m.error) : ok(m.result); }
    };
    ws.addEventListener("message", h);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}

const srv = new Server({ name: "cdp-eval", version: "1.0.0" });

srv.setRequestHandler({ method: "tools/list" }, async () => ({
  tools: [{
    name: "eval",
    description: "在浏览器当前页面中执行 JavaScript 代码并返回结果。可执行任意 JS，包括注入脚本、读取 DOM、操作存储等。",
    inputSchema: { type: "object", properties: { code: { type: "string", description: "要执行的 JavaScript 代码" } }, required: ["code"] }
  }]
}));

srv.setRequestHandler({ method: "tools/call" }, async ({ params }) => {
  if (params.name !== "eval") throw new Error("unknown tool");
  try {
    await ensure();
    const r = await cdp("Runtime.evaluate", { expression: params.arguments.code, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) return { content: [{ type: "text", text: `❌ ${r.exceptionDetails.text || r.exceptionDetails.exception?.description || "执行出错"}` }], isError: true };
    const v = r.result?.value;
    return { content: [{ type: "text", text: v !== undefined ? String(v) : (r.result?.type === "undefined" ? "undefined" : JSON.stringify(r.result)) }] };
  } catch (e) { return { content: [{ type: "text", text: `❌ ${e.message || e}` }], isError: true }; }
});

await srv.connect(new StdioServerTransport());
```

### 第二步：安装依赖

```bash
cd .\mcp-cdp-eval
npm install
```

### 第三步：加到 Claude 配置

在项目级 `.claude/settings.json`的 `mcpServers` 中加一个：

```json
{
  "mcpServers": {
    "playwright": { "...你现有的配置不变..." },
    "cdp-eval": {
      "command": "node",
      "args": ["edp-mcp路径/index.js"]
    }
  }
}
```

### 第四步：重启 Claude CLI

启动后它会多一个工具：**`mcp__cdp-eval__eval`**

---

## 验证

让 Claude 执行：

```
mcp__cdp-eval__eval → code: "document.title"
```

应该返回当前页面的标题。

然后：

```
mcp__cdp-eval__eval → code: "window.__GM_STORAGE__ = {}; window.GM = { getValue: (k,d) => window.__GM_STORAGE__[k] ?? d, setValue: (k,v) => window.__GM_STORAGE__[k] = v }; 'GM Mock 注入完成'"
```

再：

```
mcp__cdp-eval__eval → code: "这里粘贴 main.js 的全部代码"
```

**原本设想的所有流程就真正跑通了。**

---

## 然后更新 CLAUDE.md

把之前所有写 `browser_execute` 的地方替换成 `mcp__cdp-eval__eval`，参数从 `script` 改成 `code`。其他逻辑不变。

你那份实践报告里写的架构完全正确，唯一缺的就是这把钥匙。现在钥匙补上了。