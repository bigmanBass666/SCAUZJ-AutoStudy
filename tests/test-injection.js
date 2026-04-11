/**
 * 红队测试：直接注入验证优雅大师脚本
 * 工作流：
 * 1. 启动本地HTTP服务器（可选，如果直接注入则不需要）
 * 2. 在目标页面注入修复后的脚本 + Polyfill
 * 3. 验证UI元素绑定正确性
 * 4. 测试事件响应
 *
 * 用法：node test-injection.js
 * 或直接在 Playwright MCP 中分步执行各段代码
 */

const { chromium } = require('playwright');

(async () => {
  console.log('🔴 红队测试启动 - 直接注入验证');

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-web-security', // 允许跨域（如果需要）
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // 监听控制台输出
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('❌ [Page Error]', msg.text());
    } else if (msg.type() === 'warning') {
      console.warn('⚠️  [Page Warn]', msg.text());
    } else {
      console.log('📝 [Page Log]', msg.text());
    }
  });

  // 监听网络请求
  page.on('request', req => {
    if (req.url().includes('/user/node/study')) {
      console.log('🌐 [Study Request]', req.method(), req.url());
    }
  });

  try {
    // Step 1: 登录目标站点（需提前准备有效Cookie）
    console.log('📍 访问登录页...');
    await page.goto('https://scauzj.leykeji.com/user/login');

    // 等待加载
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Step 2: 注入修复后的优雅大师脚本
    console.log('💉 开始注入脚本...');

    // 1) 先注入 Polyfill（模拟 GM API）
    const polyfills = `
      // GM API Polyfill
      (function() {
        if (typeof GM_xmlhttpRequest !== 'undefined') return;

        window.GM_xmlhttpRequest = function(opts) {
          console.log('[GM] xmlhttpRequest polyfill:', opts.method, opts.url);
          return fetch(opts.url, {
            method: opts.method || 'GET',
            headers: opts.headers || { 'Content-Type': 'application/json' },
            body: opts.body ? JSON.stringify(opts.body) : undefined,
            credentials: 'include'
          }).then(res => res.json()).then(data => ({
            ok: res.ok,
            status: res.status,
            responseText: JSON.stringify(data),
            response: { text: () => Promise.resolve(JSON.stringify(data)) },
            finalUrl: opts.url
          })).catch(err => ({
            ok: false,
            status: 0,
            responseText: err.message,
            error: err.message
          }));
        };

        window.GM_setValue = function(key, value) {
          localStorage.setItem('gm_' + key, JSON.stringify(value));
          console.log('[GM] setValue:', key);
        };

        window.GM_getValue = function(key, defaultValue) {
          const v = localStorage.getItem('gm_' + key);
          console.log('[GM] getValue:', key, '=>', v || 'default');
          return v ? JSON.parse(v) : defaultValue;
        };

        window.GM_notification = function(opts) {
          console.log('[GM] notification:', opts.title, opts.text);
          // 可以创建一个页面内通知
          const div = document.createElement('div');
          div.style.cssText = 'position:fixed;top:20px;left:20px;background:#667eea;color:white;padding:12px;border-radius:8px;z-index:9999999;';
          div.textContent = opts.title + ': ' + opts.text;
          document.body.appendChild(div);
          setTimeout(() => div.remove(), 5000);
        };

        console.log('[GM] Polyfills loaded');
      })();
    `;

    await page.evaluate(polyfills);

    // 2) 读取并注入优雅大师脚本
    const fs = require('fs');
    const path = require('path');

    const scriptPath = path.join(__dirname, 'elegant-master-study.user.js');
    const rawScript = fs.readFileSync(scriptPath, 'utf8');

    // 去掉 UserScript 元信息块
    const cleanScript = rawScript.replace(/^(\/\/=+UserScript=+[\s\S]*?\/\/=\/UserScript=+\n)/, '');

    // 注入脚本
    console.log('📜 注入优雅大师脚本...');
    await page.evaluate(cleanScript);

    // Step 3: 等待UI初始化
    console.log('⏳ 等待面板初始化...');
    await page.waitForFunction(() => {
      return document.getElementById('elegant-master-panel') !== null;
    }, { timeout: 5000 }).catch(() => {
      console.error('❌ 面板未在5秒内出现');
    });

    // Step 4: 验证核心元素
    console.log('\n🔍 验证UI元素绑定...');
    const elementCheck = await page.evaluate(() => {
      const panel = document.getElementById('elegant-master-panel');
      return {
        panelExists: !!panel,
        statNode: !!panel?.querySelector('#stat-node'),
        statDuration: !!panel?.querySelector('#stat-duration'),
        statProgress: !!panel?.querySelector('#stat-progress'),
        statStatus: !!panel?.querySelector('#stat-status'),
        btnStart: !!panel?.querySelector('#btn-start'),
        btnSettings: !!panel?.querySelector('#btn-settings'),
        btnReset: !!panel?.querySelector('#btn-reset'),
        toggleBtn: !!panel?.querySelector('#elegant-toggle'),
        ctrlAutoNext: !!panel?.querySelector('#ctrl-auto-next')
      };
    });

    console.log('元素检查结果:', JSON.stringify(elementCheck, null, 2));

    // 截图保存
    const screenshotPath = `panel-check-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('📸 截图已保存:', screenshotPath);

    // Step 5: 测试状态更新功能
    console.log('\n🧪 测试状态更新...');
    await page.evaluate(() => {
      if (window.MasterEngine && window.MasterEngine.ui) {
        window.MasterEngine.ui.updateStatus('99999', 7200, 50, '运行中');
        console.log('✅ 状态更新测试完成');
      } else {
        console.error('❌ 未找到 MasterEngine.ui');
      }
    });

    // Step 6: 检查是否存在学习节点页面
    console.log('\n🎯 检查环境检测...');
    await page.goto('https://scauzj.leykeji.com/user/node/12345');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const envCheck = await page.evaluate(() => {
      if (window.MasterEngine && window.MasterEngine.detectEnvironment) {
        const env = window.MasterEngine.detectEnvironment();
        return { detected: !!env, nodeId: env?.nodeId, duration: env?.duration };
      }
      return { detected: false, error: 'MasterEngine未就绪' };
    });

    console.log('环境检测:', JSON.stringify(envCheck, null, 2));

    // Step 7: 如果有node页面，测试启动功能（不实际上报大量请求）
    if (envCheck.detected) {
      console.log('\n🚀 测试启动按钮点击...');
      const startResult = await page.evaluate(() => {
        try {
          if (window.MasterEngine && window.MasterEngine.start) {
            // 只启动一次循环，不跑完整流程
            // 这里需要修改ElegantBot.start才能限循环数，暂时只测试按钮可点击
            const btn = document.querySelector('#elegant-master-panel #btn-start');
            if (btn) {
              btn.click();
              return '按钮点击成功(未执行完整start流程)';
            }
            return '按钮未找到';
          }
          return 'MasterEngine.start不可用';
        } catch (e) {
          return '错误: ' + e.message;
        }
      });
      console.log('启动测试:', startResult);
    }

    console.log('\n✅ 测试完成，保持浏览器打开以便手动检查');
    console.log('💡 按 Ctrl+C 退出');

    // 保持运行
    await new Promise(() => {});

  } catch (err) {
    console.error('❌ 测试出错:', err);
    await browser.close();
    process.exit(1);
  }
})();
