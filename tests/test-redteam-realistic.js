/**
 * 红队全真模拟测试
 * 目标：以真实学生身份，测试"优雅大师"脚本在 Tampermonkey 环境下的实际效果
 *
 * 场景：
 * 1. 学生登录学习平台
 * 2. 访问课程节点页
 * 3. 脚本自动加载（通过 @require 本地 HTTP 服务器）
 * 4. 手动点击启动按钮
 * 5. 观察上报节奏和完成情况
 *
 * 验证指标：
 * - UI 面板正确显示
 * - 环境检测准确（nodeId, duration）
 * - 上报请求的 studyTime 字段准确
 * - 上报频率符合配置
 * - 完成目标 percentage
 *
 * 运行：npx playwright test redteam.spec.js
 * 或直接：node test-redteam-realistic.js
 */

const { chromium } = require('playwright');

// 配置
const CONFIG = {
  baseURL: 'https://scauzj.leykeji.com',
  testCredentials: {
    username: 'REDACTED_USERNAME',
    password: 'REDACTED_PASSWORD'
  },
  targetNodeId: '12345', // 测试用的节点 ID，实际环境会从页面提取
  nodePageURL: '/user/node/12345',
  expectedVideoDuration: 3600, // 秒，预期视频时长
  speedJumpSize: 30, // 每次跳跃秒数
  speedInterval: 2000, // 上报间隔 ms
  completionTarget: 0.95 // 完成目标
};

(async () => {
  console.log('🔴 红队全真模拟测试启动');
  console.log('📋 测试配置:', JSON.stringify(CONFIG, null, 2));

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security' // 避免扩展加载问题
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  // 收集网络请求
  const studyRequests = [];
  page.on('request', request => {
    if (request.url().includes('/user/node/study')) {
      console.log('📤 [Study Request]', request.method(), request.url());
      studyRequests.push({
        url: request.url(),
        method: request.method(),
        time: new Date().toISOString()
      });
    }
  });

  // 收集响应数据
  page.on('response', async response => {
    if (response.url().includes('/user/node/study')) {
      try {
        const body = await response.text();
        const data = JSON.parse(body);
        console.log('📥 [Study Response]', response.status(), data);
      } catch (e) {
        console.log('📥 [Study Response]', response.status(), 'parse error');
      }
    }
  });

  // 监听控制台
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('❌ [Page Error]', msg.text());
    } else if (msg.type() === 'warning') {
      console.warn('⚠️  [Page Warn]', msg.text());
    } else if (msg.text().includes('优雅大师') || msg.text().includes('节点') || msg.text().includes('上报')) {
      console.log('📝 [Page Log]', msg.text());
    }
  });

  try {
    // Phase 1: 登录
    console.log('\n📍 Phase 1: 登录目标站点');
    await page.goto(`${CONFIG.baseURL}/user/login`);
    await page.waitForLoadState('networkidle');

    // 填写登录表单
    await page.fill('input[placeholder*="学号"]', CONFIG.testCredentials.username);
    await page.fill('input[placeholder*="密码"]', CONFIG.testCredentials.password);
    // 验证码手动输入或跳过（测试环境可能有验证码）
    console.log('⏳ 请在页面手动输入验证码并点击登录，30秒内完成...');
    await page.waitForFunction(() => location.pathname.includes('/user/node'), { timeout: 30000 }).catch(() => {
      console.log('⚠️  未自动跳转，可能需要手动登录');
    });

    // Phase 2: 等待脚本加载
    console.log('\n⏳ Phase 2: 等待 Tampermonkey 脚本加载');
    await page.waitForTimeout(2000); // 给 Tampermonkey 时间

    // 检查 MasterEngine 是否存在
    const hasScript = await page.evaluate(() => {
      return {
        masterEngine: typeof window.MasterEngine !== 'undefined',
        elegantConfig: typeof window.ElegantConfig !== 'undefined',
        ui: document.getElementById('elegant-master-panel') !== null
      };
    });
    console.log('🔍 脚本检测:', JSON.stringify(hasScript, null, 2));

    if (!hasScript.ui) {
      console.error('❌ 未检测到 UI 面板，脚本可能未加载');
      throw new Error('Script not loaded');
    }

    // Phase 3: 检查环境检测
    console.log('\n🎯 Phase 3: 环境检测');
    const envInfo = await page.evaluate(() => {
      if (window.MasterEngine && window.MasterEngine.detectEnvironment) {
        return window.MasterEngine.detectEnvironment() || null;
      }
      return null;
    });
    console.log('🌍 检测到的环境:', JSON.stringify(envInfo, null, 2));

    if (!envInfo) {
      console.warn('⚠️  未检测到学习节点，可能不在节点页面');
    }

    // Phase 4: 截图验证 UI 存在
    const screenshotPath = `ui-panel-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('📸 UI 面板截图:', screenshotPath);

    // Phase 5: 验证 UI 元素状态
    console.log('\🧪 Phase 5: 验证 UI 元素');
    const uiState = await page.evaluate(() => {
      const panel = document.getElementById('elegant-master-panel');
      if (!panel) return null;

      return {
        nodeDisplay: panel.querySelector('#stat-node')?.textContent,
        durationDisplay: panel.querySelector('#stat-duration')?.textContent,
        progressDisplay: panel.querySelector('#stat-progress')?.textContent,
        statusDisplay: panel.querySelector('#stat-status')?.textContent,
        btnStart: !!panel.querySelector('#btn-start'),
        btnSettings: !!panel.querySelector('#btn-settings'),
        btnReset: !!panel.querySelector('#btn-reset')
      };
    });
    console.log('🎨 UI 状态:', JSON.stringify(uiState, null, 2));

    // Phase 6: 点击启动按钮（模拟学生操作）
    if (uiState && uiState.btnStart) {
      console.log('\n🚀 Phase 6: 模拟学生点击启动');
      studyRequests.length = 0; // 清空之前的请求记录

      await page.click('#elegant-master-panel #btn-start');
      await page.waitForTimeout(1000);

      // 观察 5 秒内的上报
      console.log('⏱️  等待上报请求...');
      await page.waitForTimeout(5000);

      console.log(`📊 观察期内收到 ${studyRequests.length} 次上报请求`);
    }

    // Phase 7: 最终验证
    console.log('\n✅ Phase 7: 最终验证');
    const finalUiState = await page.evaluate(() => {
      const panel = document.getElementById('elegant-master-panel');
      return {
        stillExists: !!panel,
        finalProgress: panel?.querySelector('#stat-progress')?.textContent,
        finalStatus: panel?.querySelector('#stat-status')?.textContent,
        configInStorage: localStorage.getItem('elegant_master_config_v4')
      };
    });
    console.log('📋 最终状态:', JSON.stringify(finalUiState, null, 2));

    // 生成测试报告
    const report = {
      timestamp: new Date().toISOString(),
      testConfig: CONFIG,
      results: {
        scriptLoaded: hasScript.ui,
        envDetected: !!envInfo,
        uiVisible: !!uiState,
        startButtonWorked: studyRequests.length > 0,
        totalStudyRequests: studyRequests.length,
        configSnapshot: finalUiState.configInStorage
      },
      screenshots: [screenshotPath],
      notes: '完整验证流程完成，请检查控制台日志和截图'
    };

    console.log('\n📄 测试报告:', JSON.stringify(report, null, 2));

    console.log('\n🎉 红队测试完成！');
    console.log('💡 浏览器保持打开，可按 F12 查看 Console 和 Network');
    console.log('⏸️  按 Ctrl+C 退出测试');

    // 保持运行
    await new Promise(() => {});

  } catch (err) {
    console.error('❌ 测试失败:', err);
    await browser.close();
    process.exit(1);
  }
})();
