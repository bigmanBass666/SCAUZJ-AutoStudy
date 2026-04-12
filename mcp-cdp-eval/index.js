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
      if (m.id === n) {
        ws.removeEventListener("message", h);
        m.error ? fail(m.error) : ok(m.result);
      }
    };
    ws.addEventListener("message", h);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}

const srv = new Server({ name: "cdp-eval", version: "1.0.0" });

srv.setRequestHandler(
  { method: "tools/list" },
  async () => ({
    tools: [
      {
        name: "eval",
        description: "在浏览器当前页面中执行 JavaScript 代码并返回结果。可执行任意 JS，包括注入脚本、读取 DOM、操作存储等。",
        inputSchema: {
          type: "object",
          properties: {
            code: { type: "string", description: "要执行的 JavaScript 代码" },
          },
          required: ["code"],
        },
      },
    ],
  })
);

srv.setRequestHandler(
  { method: "tools/call" },
  async ({ params }) => {
    if (params.name !== "eval") throw new Error("unknown tool");
    try {
      await ensure();
      const r = await cdp("Runtime.evaluate", {
        expression: params.arguments.code,
        returnByValue: true,
        awaitPromise: true,
      });
      if (r.exceptionDetails)
        return {
          content: [
            {
              type: "text",
              text: `❌ ${
                r.exceptionDetails.text ||
                r.exceptionDetails.exception?.description ||
                "执行出错"
              }`,
            },
          ],
          isError: true,
        };
      const v = r.result?.value;
      return {
        content: [
          {
            type: "text",
            text:
              v !== undefined
                ? String(v)
                : r.result?.type === "undefined"
                ? "undefined"
                : JSON.stringify(r.result),
          },
        ],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `❌ ${e.message || e}` }],
        isError: true,
      };
    }
  }
);

await srv.connect(new StdioServerTransport());
