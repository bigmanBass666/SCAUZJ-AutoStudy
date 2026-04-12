/**
 * 自动化测试运行器 - 无 Tampermonkey 依赖
 *
 * 用法：
 *   1. 确保本地服务器运行：python -m http.server 8081
 *   2. 运行：node tests/run-automated.js
 *
 * 功能：
 *   - 启动 Playwright Chromium
 *   - 登录（可选，如果已登录则跳过）
 *   - 直接注入优雅大师脚本
 *   - 测试刷课流程
 *   - 生成测试报告
 */

const { chromium } = require('playwright');

// 配置
const CONFIG = {
    baseUrl: 'https://scauzj.leykeji.com',
    nodeId: '1429487',
    account: 'REDACTED_USERNAME',
    password: 'REDACTED_PASSWORD',
    localScript: 'http://localhost:8081/elegant-master-study.user.js'
};

(async () => {
    console.log('🚀 启动自动化测试...\n');

    // 1. 启动浏览器（持久化上下文保存登录状态）
    const browser = await chromium.launchPersistentContext('./data/browser-profile', {
        headless: false,  // 设为 true 无头模式
        viewport: { width: 1280, height: 800 },
        args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
        ]
    });

    const page = await browser.newPage();

    // 监听控制台日志
    page.on('console', msg => {
        if (msg.text().includes('优雅大师')) {
            console.log('📋', msg.text());
        }
    });

    // 监听网络请求（刷课上报）
    const studyRequests = [];
    page.on('request', req => {
        if (req.url().includes('/user/node/study')) {
            studyRequests.push({
                url: req.url(),
                method: req.method(),
                postData: req.postData()
            });
        }
    });

    try {
        // 2. 访问首页，检查登录状态
        console.log('📍 访问首页检查登录状态...');
        await page.goto(CONFIG.baseUrl + '/', { waitUntil: 'networkidle' });

        // 3. 如果未登录，执行登录
        const isLoggedIn = await page.evaluate(() => {
            // 简单判断：URL 包含 /user/index 或 有"退出登录"链接
            return location.href.includes('/user/index') ||
                   document.querySelector('a[href*="logout"]') !== null;
        });

        if (!isLoggedIn) {
            console.log('🔐 未登录，执行登录流程...');
            await page.goto(CONFIG.baseUrl + '/user/login', { waitUntil: 'networkidle' });

            // 填写表单
            await page.fill('input[name="username"]', CONFIG.account);
            await page.fill('input[name="password"]', CONFIG.password);

            // TODO: 验证码识别（暂时手动或跳过）
            // 这里可以调用 OCR API 自动识别验证码

            await page.click('button[type="submit"], input[type="submit"]');
            await page.waitForURL(/\/user\/index/, { timeout: 10000 });
            console.log('✅ 登录成功');
        } else {
            console.log('✅ 已登录');
        }

        // 4. 导航到节点页
        const nodeUrl = `${CONFIG.baseUrl}/user/node?nodeId=${CONFIG.nodeId}`;
        console.log(`🎯 导航到节点页: ${nodeUrl}`);
        await page.goto(nodeUrl, { waitUntil: 'networkidle' });

        // 5. ⚡ 关键步骤：直接注入脚本（绕过 Tampermonkey）
        console.log('📥 正在从本地服务器获取脚本...');
        const scriptContent = await fetch(CONFIG.localScript + '?t=' + Date.now())
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.text();
            });

        console.log('💉 注入脚本到页面...');
        // 移除 UserScript 头部元数据（如果不是在 Tampermonkey 环境）
        const cleanScript = scriptContent
            .replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\n/, '')
            .trim();

        await page.evaluate(cleanScript);
        console.log('✅ 脚本注入完成');

        // 等待 UI 创建
        await page.waitForFunction(() => {
            return document.getElementById('elegant-master-panel') !== null;
        }, { timeout: 5000 });
        console.log('✅ UI 面板已创建');

        // 6. 等待 URL 监听器检测节点（最多5秒）
        console.log('⏳ 等待节点检测...');
        const detected = await page.waitForFunction(() => {
            const nodeEl = document.querySelector('#stat-node');
            return nodeEl && nodeEl.textContent !== '--' && nodeEl.textContent !== '';
        }, { timeout: 5000 }).catch(() => false);

        if (!detected) {
            throw new Error('节点检测超时');
        }

        const nodeInfo = await page.evaluate(() => {
            const panel = document.getElementById('elegant-master-panel');
            return {
                nodeId: panel.querySelector('#stat-node')?.textContent,
                duration: panel.querySelector('#stat-duration')?.textContent,
                progress: panel.querySelector('#stat-progress')?.textContent,
                status: panel.querySelector('#stat-status')?.textContent
            };
        });
        console.log(`📊 节点信息: ${JSON.stringify(nodeInfo)}`);

        if (nodeInfo.nodeId !== CONFIG.nodeId) {
            console.warn(`⚠️  节点ID不匹配: 期望 ${CONFIG.nodeId}, 实际 ${nodeInfo.nodeId}`);
        }

        // 7. 点击"🚀 启动"按钮
        console.log('🚀 点击启动按钮...');
        await page.click('button:has-text("🚀 启动")');

        // 8. 等待启动完成
        await page.waitForTimeout(2000);

        // 9. 检查上报请求
        console.log('\n📡 监控上报请求...');
        await page.waitForTimeout(5000);

        if (studyRequests.length > 0) {
            console.log(`✅ 发现 ${studyRequests.length} 次上报请求`);
            studyRequests.forEach((req, i) => {
                console.log(`   请求 ${i + 1}: time=${req.postData?.slice(-20)}...`);
            });
        } else {
            console.log('❌ 未检测到上报请求');
        }

        // 10. 检查最终状态
        const finalStatus = await page.evaluate(() => {
            const panel = document.getElementById('elegant-master-panel');
            if (!panel) return null;
            return {
                progress: panel.querySelector('#stat-progress')?.textContent,
                status: panel.querySelector('#stat-status')?.textContent
            };
        });
        console.log(`\n📈 最终状态: ${JSON.stringify(finalStatus)}`);

        // 11. 生成测试报告
        console.log('\n' + '='.repeat(50));
        console.log('📋 测试报告');
        console.log('='.repeat(50));
        console.log(`节点 ID:    ${nodeInfo.nodeId}`);
        console.log(`视频时长:   ${nodeInfo.duration}`);
        console.log(`检测结果:   ${detected ? '✅ 成功' : '❌ 失败'}`);
        console.log(`上报次数:   ${studyRequests.length}`);
        console.log(`最终进度:   ${finalStatus?.progress || 'N/A'}`);
        console.log(`最终状态:   ${finalStatus?.status || 'N/A'}`);
        console.log('='.repeat(50));

        const success = studyRequests.length > 0 && finalStatus?.progress !== '0%';
        console.log(success ? '\n✅ 测试通过！' : '\n❌ 测试失败');

    } catch (err) {
        console.error('\n❌ 测试-error.message);
        console.error('Stack:', err.stack);
    } finally {
        // 保持浏览器打开以便调试（可选）
        // await browser.close();
        console.log('\n🔚 测试结束');
    }
})();
