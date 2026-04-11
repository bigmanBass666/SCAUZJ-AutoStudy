/**
 * 注入用的分块脚本文具
 * 用于通过 page.evaluate 分段注入长脚本
 */

const fs = require('fs');
const path = require('path');

// 读取完整脚本
const fullScript = fs.readFileSync(
  path.join(__dirname, 'elegant-master-study.user.js'),
  'utf8'
);

// 去掉元信息
const cleanScript = fullScript.replace(/^(\/\/==+UserScript==+[\s\S]*?\/\/==\/UserScript==+\n)/, '');

// 按班级分段
const chunks = [
  'window.GM_xmlhttpRequest = (opts) => fetch(opts.url, { method: opts.method || "GET", headers: opts.headers || { "Content-Type": "application/json" }, body: opts.body ? JSON.stringify(opts.body) : undefined, credentials: "include" }).then(r => r.json()).then(data => ({ ok: r.ok, status: r.status, responseText: JSON.stringify(data), response: { text: () => Promise.resolve(JSON.stringify(data)) }, finalUrl: opts.url })).catch(err => ({ ok: false, status: 0, responseText: err.message, error: err.message }));',
  'window.GM_setValue = (k, v) => localStorage.setItem("gm_" + k, JSON.stringify(v));',
  'window.GM_getValue = (k, dv) => { const v = localStorage.getItem("gm_" + k); return v ? JSON.parse(v) : dv; };',
  'window.GM_notification = (opts) => console.log("[GM] notification:", opts.title, opts.text);',
  // 第一段：DEFAULTS + ConfigManager
  cleanScript.match(/\/\*===\*\/\s+默认配置[\s\S]*?class ConfigManager[\s\S]*?}\s+\/\*===\*\/\s+/)?.[0] || '',
  // 第二段：UIBuilder（核心修复）
  cleanScript.match(/class UIBuilder[\s\S]*?destroy\(\)[\s\S]*?}/)?.[0] || '',
  // 第三段：ElegantBot + MasterController
  cleanScript.match(/class ElegantBot[\s\S]*?class MasterController[\s\S]*?}\s+async function init\(\)/)?.[0] || '',
  'async function init() { await new Promise(resolve => { if (document.readyState === "complete") resolve(); else window.addEventListener("load", resolve); }); await new Promise(resolve => setTimeout(resolve, 500)); const configMgr = new ConfigManager(); const ui = new UIBuilder(configMgr); const engine = new MasterController(configMgr, ui); ui.create(); window.MasterEngine = engine; window.ElegantConfig = configMgr; const env = engine.detectEnvironment(); if (env) { ui.updateStatus(env.nodeId, env.duration, null, "待机"); console.log("🌟 优雅大师已就绪，点击\"🚀 启动\"开始"); } else { console.log("⚠️  未检测到学习节点，请先访问课程页面"); } } init();'
];

console.log('分段数:', chunks.length);
console.log('第一段长度:', chunks[0]?.length || 0);

// 输出为可以直接粘贴到 Playwright 的代码片段
const output = chunks.map((chunk, i) => `
// Chunk ${i + 1} (${chunk.length} bytes)
await page.evaluate(() => { ${chunk} });
`).join('\n');

console.log('\n=== 可以直接粘贴到 Playwright MCP 的代码 ===\n');
console.log(output);
