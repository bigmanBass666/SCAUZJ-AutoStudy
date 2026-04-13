// ==UserScript==
// @name         🌟 优雅大师 - 开发环境（真·热重载）
// @namespace    security.elegant.master
// @version      11.0.0-hotreload
// @description  开发调试版 - 每次页面加载都从localhost:8081获取最新代码，无需重启浏览器
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
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_URL = 'http://localhost:8081/elegant-master-study.user.js';
    const CACHE_KEY = 'elegant_hotreload_cache';
    const CACHE_TIME_KEY = 'elegant_hotreload_time';

    async function loadLatestScript() {
        const ts = Date.now();
        const url = `${SCRIPT_URL}?t=${ts}&r=${Math.random().toString(36).substring(7)}`;

        console.log(`[热重载] 正在从 ${url} 获取最新脚本...`);

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
            console.log(`[热重载] ✅ 脚本获取成功! 大小: ${(code.length / 1024).toFixed(1)}KB`);
            eval(code);
            console.log(`[热重载] ✅ 脚本执行完成! 版本: ${window.ELEGANT_VERSION || 'unknown'}`);
        } catch(e) {
            console.error(`[热重载] ❌ 加载失败:`, e.message);
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                console.log(`[热重载] 📦 使用缓存版本 (${localStorage.getItem(CACHE_TIME_KEY)})`);
                try { eval(cached); } catch(e2) { console.error('[热重载] 缓存也失败了:', e2.message); }
            } else {
                alert(`优雅大师热重载失败:\n${e.message}\n\n请确保 http-server 在 8081 端口运行!`);
            }
        }
    }

    init();
})();
