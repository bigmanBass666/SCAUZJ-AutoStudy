## 核心思路转变：不要操控油猴，绕过它

你的困境本质是一个**错误假设**：测试必须经过油猴。实际上：

```
❌ 错误路径：AI写代码 → 操控油猴扩展页 → 安装/更新 → 测试
                    ↑ 这里是死胡同

✅ 正确路径：AI写代码 → 直接注入页面上下文 → 测试
                    ↑ 完全不需要油猴参与
```

油猴只是一个**注入器 + GM API 提供者**。测试时，我们用代码模拟这两个角色即可。

---

## 方案一：Playwright 直接注入（最推荐，真正闭环）

### 原理

```
┌──────────┐    修改代码     ┌────────────┐   browser_execute   ┌───────────┐
│  AI      │ ──────────────▶ │ main.js    │ ──────────────────▶ │ 目标网页  │
│ (Claude) │                 │ (磁盘文件) │  注入GM Mock+脚本   │ (Playwright│
└────┬─────┘                 └────────────┘                    │  浏览器)  │
     │                                                          └─────┬─────┘
     │  ◀──── 读取 console.log / DOM 快照 / 截图 ◀────────────────────┘
     │
     ▼
  判断通过？──NO──▶ 修改代码 ──┐
     │                         │
    YES                        │
     │                         │
     ▼                         │
  完成                         ┘
```

### 第一步：写一个 GM API Mock 库

保存为 `gm-mock.js`，每次测试时先注入这个：

```javascript
// gm-mock.js —— 在页面上下文中模拟油猴的 GM_* API
window.__GM_STORAGE__ = window.__GM_STORAGE__ || {};

const GM = {
    // 存储类
    getValue: (key, defaultVal) => {
        const val = window.__GM_STORAGE__[key];
        return val !== undefined ? val : defaultVal;
    },
    setValue: (key, val) => {
        window.__GM_STORAGE__[key] = val;
    },
    deleteValue: (key) => {
        delete window.__GM_STORAGE__[key];
    },
    listValues: () => {
        return Object.keys(window.__GM_STORAGE__);
    },

    // 样式注入
    addStyle: (css) => {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        return style;
    },

    // 网络请求（简化版，实际场景按需扩展）
    xmlhttpRequest: (details) => {
        console.log(`[GM Mock] xmlhttpRequest → ${details.method} ${details.url}`);
        return fetch(details.url, {
            method: details.method || 'GET',
            headers: details.headers || {},
            body: details.data || null,
        }).then(r => r.text()).then(text => {
            if (details.onload) details.onload({ response: text, status: 200 });
        }).catch(err => {
            if (details.onerror) details.onerror(err);
        });
    },

    // 通知
    notification: (details) => {
        console.log(`[GM Mock] 通知: ${details.text || details.title}`);
    },

    // 剪贴板
    setClipboard: (text) => {
        console.log(`[GM Mock] 复制到剪贴板: ${text}`);
    },

    // 菜单命令
    registerMenuCommand: (name, fn) => {
        console.log(`[GM Mock] 注册菜单: ${name}`);
    },

    // 日志
    log: (...args) => console.log('[GM]', ...args),

    // unsafeWindow 就是 window（在页面上下文中）
};

// 挂到 window 上，让被注入的脚本能访问
window.GM = GM;
window.GM_getValue = GM.getValue;
window.GM_setValue = GM.setValue;
window.GM_deleteValue = GM.deleteValue;
window.GM_addStyle = GM.addStyle;
window.GM_xmlhttpRequest = GM.xmlhttpRequest;
window.GM_notification = GM.notification;
window.GM_setClipboard = GM.setClipboard;
window.GM_registerMenuCommand = GM.registerMenuCommand;
window.GM_log = GM.log;
window.unsafeWindow = window;

console.log('✅ GM API Mock 已注入');
```

### 第二步：被测试的脚本做微调

你的脚本**不需要大改**，只需要在顶部加一行兼容：

```javascript
// ==UserScript==
// @name         你的脚本名
// @match        *://*.example.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

// 👇 兼容层：如果 GM 不存在（被 Mock 注入模式），用 window 上的
const _GM_getValue  = typeof GM_getValue !== 'undefined'  ? GM_getValue  : window.GM_getValue;
const _GM_setValue  = typeof GM_setValue !== 'undefined'  ? GM_setValue  : window.GM_setValue;
// ... 其他 GM API 同理

// ====== 下面是你原有的脚本代码，不用改 ======
```

### 第三步：AI 用 Playwright MCP 执行完整测试

AI 的工作流（你可以直接放进 system prompt）：

```
测试流程：
1. 用 browser_navigate 打开目标页面
2. 用 browser_execute 注入 gm-mock.js 的全部代码
3. 用 browser_execute 注入被测试脚本 main.js 的全部代码
4. 等待适当时间（或用 browser_snapshot 观察 DOM 变化）
5. 用 browser_execute 读取测试结果：
   - return document.querySelector('.某元素')?.textContent
   - return window.__TEST_RESULT__
   - 或检查 console.log 输出
6. 用 browser_screenshot 截图确认视觉效果
7. 根据结果决定修改代码还是通过
```

**实际 browser_execute 调用示例**：

```javascript
// 第2步：注入 Mock（把 gm-mock.js 内容粘贴进来）
// browser_execute 的参数就是一段 JS 代码

// 第3步：注入脚本
// browser_execute: "这里粘贴你的 main.js 全部代码"

// 第5步：读取结果
// browser_execute: 
// "return { 
//     resultText: document.querySelector('#result')?.innerText,
//     storage: JSON.stringify(window.__GM_STORAGE__),
//     bodyHTML: document.body.innerText.substring(0, 500)
// }"
```

---

## 方案二：引导脚本 + 本地服务器（真实油猴环境测试）

如果你**必须**在真实油猴环境中验证（比如 GM_xmlhttpRequest 的跨域行为 Mock 无法模拟），用这个：

### 原理

```
油猴安装一个"永不改变"的引导脚本
         │
         ▼ @require 引用 → 不变
    ┌─────────────┐
    │  boot.js    │ 作用：把 GM API 挂到 window，动态加载主脚本
    └──────┬──────┘
           │ document.createElement('script')
           │ script.src = 'http://localhost:8080/main.js?_t=时间戳'
           ▼
    ┌─────────────┐
    │  main.js    │ ← AI 随时修改这个文件，无需重新安装油猴脚本
    │ (本地服务器) │     每次刷新页面自动拉最新版本
    └─────────────┘
```

### 引导脚本（安装到油猴，只装一次）

```javascript
// ==UserScript==
// @name        Dev Boot Loader
// @namespace   dev-loader
// @version     1.0.0
// @description 动态加载本地开发中的主脚本
// @match       *://*.your-target-site.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_log
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 把所有 GM API 挂到 window 上，供主脚本使用
    window.__GM__ = {
        getValue:          GM_getValue,
        setValue:          GM_setValue,
        addStyle:          GM_addStyle,
        xmlhttpRequest:    GM_xmlhttpRequest,
        notification:      GM_notification,
        setClipboard:      GM_setClipboard,
        registerMenuCommand: GM_registerMenuCommand,
        log:               GM_log,
    };

    // 动态加载主脚本，加时间戳破缓存
    const script = document.createElement('script');
    script.src = 'http://localhost:8080/main.js?_t=' + Date.now();
    script.onload = () => console.log('✅ main.js 已加载');
    script.onerror = (e) => console.error('❌ main.js 加载失败，请确认本地服务器已启动', e);
    (document.head || document.documentElement).appendChild(script);
})();
```

### 本地服务器（零依赖，Python 一行）

```bash
# 在 main.js 所在目录执行
python3 -m http.server 8080 --bind 127.0.0.1
```

### 主脚本微调

```javascript
// main.js（不需要 UserScript 头部，因为它不是被油猴直接加载的）
const GM = window.__GM__;

// 用 GM.getValue 代替 GM_getValue
const config = GM.getValue('config', {});

// ... 你的业务逻辑 ...
```

### AI 的工作流

```
1. AI 修改 main.js（直接写文件）
2. AI 用 browser_navigate 刷新目标页面
3. 引导脚本自动拉取最新的 main.js（带时间戳，不缓存）
4. AI 用 browser_snapshot / browser_screenshot 检查结果
5. 循环
```

**关键优势**：AI 只需要刷新页面，**完全不需要碰 chrome-extension://**。

---

## 方案三：双轨制（最稳健）

```
开发迭代（每分钟多次）          最终验证（每轮一次）
        │                              │
        ▼                              ▼
  方案一：Playwright              方案二：引导脚本
  直接注入 Mock                  真实油猴环境
  速度快，完全闭环               验证 GM API 真实行为
  不依赖油猴/本地服务器           需要本地服务器 + 一次安装
```

---

## 完整的 AI System Prompt（直接可用）

把以下内容加到你的 system prompt 中，AI 就能自主完成闭环：

```markdown
## 油猴脚本自主开发测试协议

你正在开发一个 Tampermonkey 用户脚本。你可以通过 Playwright MCP 自主完成
"编写代码 → 注入测试 → 观察结果 → 修改代码"的完整闭环。

### 测试方式

使用"直接注入法"——不需要 Tampermonkey，直接在页面中模拟 GM API。

#### 步骤

1. **打开页面**
   调用 browser_navigate 打开目标网站

2. **注入 GM Mock**
   调用 browser_execute，注入以下代码（完整粘贴）：
   [这里粘贴 gm-mock.js 的完整内容]

3. **注入被测脚本**
   调用 browser_execute，注入 main.js 的完整代码

4. **等待执行**
   如果脚本有异步操作（setTimeout、fetch等），调用 browser_execute 执行
   `await new Promise(r => setTimeout(r, 3000))` 等待

5. **收集结果**
   调用 browser_execute 读取：
   - DOM 状态：`return document.body.innerHTML.substring(0,2000)`
   - 存储状态：`return JSON.stringify(window.__GM_STORAGE__)`
   - 特定元素：`return document.querySelector('xxx')?.textContent`
   调用 browser_screenshot 截图确认

6. **判断与迭代**
   - 如果结果符合预期 → 告诉用户测试通过
   - 如果不符合 → 修改 main.js 代码，回到步骤3

### 注意事项
- 每次注入脚本前，先刷新页面（browser_navigate），避免重复注入
- GM Mock 中 GM_xmlhttpRequest 是简化版，如果测试涉及复杂跨域请求，
  改用"引导脚本方案"（方案二）
- 脚本中使用 GM_getValue 等全局函数前加兼容检查
- 遇到 CORS 错误时，在 browser_navigate 前先执行：
  `browser_execute: document.domain` 确认域名
```

---

## 关于"让 AI 真正自主"的最后一点

你现在缺少的不是技术方案，而是一个**"AI 能自己写的启动脚本"**。我建议你创建这样一个项目结构：

```
tampermonkey-dev/
├── gm-mock.js          # GM API 模拟（固定不动）
├── main.js             # AI 开发的脚本（AI 随意修改）
├── test-runner.js      # AI 生成的测试用例（AI 随意修改）
└── README.md           # 包含上面的 system prompt
```

其中 `test-runner.js` 是 AI 自己写的测试代码，会被 Playwright 注入到页面中执行：

```javascript
// test-runner.js —— AI 自己写的测试
// 这个文件由 AI 根据当前开发需求自动生成和修改

async function runTests() {
    const results = [];
    
    // 测试1：脚本是否正确添加了按钮
    const btn = document.querySelector('#my-script-btn');
    results.push({
        name: '按钮存在',
        pass: !!btn,
        detail: btn ? '找到按钮' : '未找到按钮'
    });
    
    // 测试2：点击按钮后的行为
    if (btn) {
        btn.click();
        await new Promise(r => setTimeout(r, 1000));
        const modal = document.querySelector('.my-modal');
        results.push({
            name: '点击弹出弹窗',
            pass: !!modal,
            detail: modal ? '弹窗已显示' : '弹窗未显示'
        });
    }
    
    // 测试3：存储功能
    window.GM.setValue('test_key', 'test_value');
    const val = window.GM.getValue('test_key');
    results.push({
        name: 'GM 存储读写',
        pass: val === 'test_value',
        detail: `写入 test_value，读回 ${val}`
    });
    
    // 挂到 window 上让 AI 读取
    window.__TEST_RESULTS__ = results;
    
    // 同时输出到 console
    results.forEach(r => {
        console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.name}: ${r.detail}`);
    });
    
    const allPass = results.every(r => r.pass);
    console.log(allPass ? '\n✅ 全部通过' : '\n❌ 存在失败');
    return allPass;
}

runTests();
```

然后 AI 用 Playwright 读取结果：

```javascript
// browser_execute:
"return JSON.stringify(window.__TEST_RESULTS__)"
```

**这样 AI 就能完全自主地：写脚本 → 写测试 → 注入执行 → 读取结果 → 修改脚本 → 重新测试，形成真正的闭环。**