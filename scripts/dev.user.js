// ==UserScript==
// @name         🌟 优雅大师 - 开发环境（真·热重载）
// @namespace    security.elegant.master
// @version      13.0.0-hotreload
// @description  开发调试版 - GM沙箱eval执行，完整GM API支持，无CORS限制
// @match        https://scauzj.leykeji.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_notification
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_log
// @grant        unsafeWindow
// @connect      localhost
// @connect      api.ocr.space
// @connect      aip.baidubce.com
// @connect      cloud.tencent.com
// @connect      api.puter.com
// @connect      scauzj.leykeji.com
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const PORT = 18923;
    const SCRIPT_URL = `http://localhost:${PORT}/elegant-master-study.user.js`;
    const CACHE_KEY = 'elegant_hotreload_cache';
    const CACHE_TIME_KEY = 'elegant_hotreload_time';

    async function loadLatestScript() {
        const ts = Date.now();
        const url = `${SCRIPT_URL}?t=${ts}&r=${Math.random().toString(36).substring(7)}`;

        console.log(`[DevHotReload] 🔄 正在从 ${url} 获取最新脚本...`);

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function(response) {
                    if (response.status === 200 && response.responseText.length > 1000) {
                        resolve(response.responseText);
                    } else {
                        reject(new Error(`HTTP ${response.status}, size=${response.responseText?.length || 0}`));
                    }
                },
                onerror: function(err) {
                    reject(new Error('GM_xmlhttpRequest失败: ' + (err?.error || err?.message || 'unknown')));
                },
                ontimeout: function() {
                    reject(new Error('请求超时(10s)'));
                },
                timeout: 10000
            });
        });
    }

    async function init() {
        try {
            const code = await loadLatestScript();
            console.log(`[DevHotReload] ✅ 脚本获取成功! 大小: ${(code.length / 1024).toFixed(1)}KB`);

            localStorage.setItem(CACHE_KEY, code);
            localStorage.setItem(CACHE_TIME_KEY, new Date().toISOString());

            unsafeWindow.__ELEGANT_MASTER_HR_COUNT = 1;
            unsafeWindow.__ELEGANT_MASTER_HOTRELOAD__ = true;

            unsafeWindow.GM_xmlhttpRequest = GM_xmlhttpRequest;
            unsafeWindow.GM_getValue = GM_getValue;
            unsafeWindow.GM_setValue = GM_setValue;
            unsafeWindow.GM_deleteValue = GM_deleteValue;
            unsafeWindow.GM_addStyle = GM_addStyle;
            unsafeWindow.GM_notification = GM_notification;
            unsafeWindow.GM_setClipboard = GM_setClipboard;
            unsafeWindow.GM_registerMenuCommand = GM_registerMenuCommand;
            unsafeWindow.unsafeWindow = unsafeWindow;

            eval(code);

            const ver = unsafeWindow.ELEGANT_VERSION || unsafeWindow.MasterEngine?.version || 'unknown';
            console.log(`[DevHotReload] ✅ 脚本执行完成! 版本: ${ver}`);
            console.log(`[DevHotReload] ✅ GM_xmlhttpRequest: ${typeof unsafeWindow.GM_xmlhttpRequest !== 'undefined' ? '已桥接' : '未桥接(脚本自带检测)'}`);

        } catch(e) {
            console.error(`[DevHotReload] ❌ 加载失败:`, e.message);
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                console.log(`[DevHotReload] 📦 使用缓存版本 (${localStorage.getItem(CACHE_TIME_KEY)})`);
                unsafeWindow.__ELEGANT_MASTER_HR_COUNT = 1;
                unsafeWindow.__ELEGANT_MASTER_HOTRELOAD__ = true;
                unsafeWindow.GM_xmlhttpRequest = GM_xmlhttpRequest;
                unsafeWindow.GM_getValue = GM_getValue;
                unsafeWindow.GM_setValue = GM_setValue;
                unsafeWindow.GM_deleteValue = GM_deleteValue;
                unsafeWindow.GM_addStyle = GM_addStyle;
                unsafeWindow.GM_notification = GM_notification;
                unsafeWindow.GM_setClipboard = GM_setClipboard;
                unsafeWindow.GM_registerMenuCommand = GM_registerMenuCommand;
                unsafeWindow.unsafeWindow = unsafeWindow;
                try { eval(cached); } catch(e2) { console.error('[DevHotReload] 缓存也失败了:', e2.message); }
            } else {
                console.warn(`[DevHotReload] ⚠️ 无缓存可用，请确保 http-server 在 ${PORT} 端口运行`);
                console.warn(`[DevHotReload] ⚠️ 启动命令: cd scripts && python -m http.server ${PORT}`);
            }
        }
    }

    init();
})();
