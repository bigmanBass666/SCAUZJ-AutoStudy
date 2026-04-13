// ==UserScript==
// @name         🌟 优雅大师 - 热重载引导器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  自动检测开发服务器并加载最新版优雅大师脚本
// @author       ElegantMaster Team
// @match        https://scauzj.leykeji.com/*
// @grant        none
// @run-at      document-start
// ==/UserScript==

(function() {
    'use strict';
    
    if (window.__ELEGANT_BOOTSTRAP_LOADED) return;
    window.__ELEGANT_BOOTSTRAP_LOADED = true;
    
    const PORT = 18923;
    const URL = `http://localhost:${PORT}/elegant-master-study.user.js`;
    const TIMEOUT = 2000;
    const MAX_RETRIES = 2;
    
    let retryCount = 0;
    
    async function tryLoadDevVersion() {
        if (retryCount >= MAX_RETRIES) {
            console.log('[Bootstrap] ✅ 达到最大重试次数，使用已安装版本');
            return;
        }
        
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
            
            await fetch(URL + '?t=' + Date.now() + '&r=' + retryCount, {
                method: 'HEAD',
                mode: 'no-cors',
                signal: ctrl.signal
            });
            
            clearTimeout(timer);
            
            console.log(`[Bootstrap] 🔄 检测到开发服务器(端口${PORT})，加载最新版...`);
            
            const s = document.createElement('script');
            s.src = URL + '?t=' + Date.now();
            s.onload = () => console.log('[Bootstrap] ✅ 开发版加载完成');
            s.onerror = () => {
                console.warn('[Bootstrap] ⚠️ 开发版加载失败');
                retryCount++;
                setTimeout(tryLoadDevVersion, 1000);
            };
            document.head.appendChild(s);
            
        } catch(e) {
            console.log(`[Bootstrap] ℹ️ 开发服务器离线(t=${Date.now()}), 使用已安装版本`);
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryLoadDevVersion);
    } else {
        tryLoadDevVersion();
    }
})();
