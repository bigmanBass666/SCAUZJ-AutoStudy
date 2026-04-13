// GM API Mock —— 在页面上下文中模拟油猴的 GM_* API
// 用途：让用户脚本无需Tampermonkey也能在Playwright测试中运行

window.__GM_STORAGE__ = window.__GM_STORAGE__ || {};

const GM = {
    // 存储
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
    listValues: () => Object.keys(window.__GM_STORAGE__),

    // 样式注入
    addStyle: (css) => {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        return style;
    },

    // 网络请求（简化版）
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
};

// 挂载到 window
Object.assign(window, {
    GM,
    GM_getValue: GM.getValue,
    GM_setValue: GM.setValue,
    GM_deleteValue: GM.deleteValue,
    GM_addStyle: GM.addStyle,
    GM_xmlhttpRequest: GM.xmlhttpRequest,
    GM_notification: GM.notification,
    GM_setClipboard: GM.setClipboard,
    GM_registerMenuCommand: GM.registerMenuCommand,
    GM_log: GM.log,
    unsafeWindow: window,
});

console.log('✅ GM API Mock 已注入');
