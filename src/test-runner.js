// test-runner.js - AI 自主测试套件
// 用途：验证优雅大师在直接注入模式下是否正常工作

async function runTests() {
    const results = [];

    // 等待页面和脚本加载
    await new Promise(r => setTimeout(r, 1500));

    // ✅ 测试1：GM Mock是否加载
    const hasGM = (typeof window.GM !== 'undefined') || (typeof window.GM_getValue !== 'undefined');
    results.push({
        name: 'GM API 模拟已加载',
        pass: hasGM,
        detail: hasGM ? 'window.GM 对象存在' : 'GM 对象不存在'
    });

    // ✅ 测试2：主脚本是否创建了面板
    const panel = document.getElementById('elegant-master-panel');
    results.push({
        name: 'UI 面板已创建',
        pass: !!panel,
        detail: panel ? `面板高度: ${panel.offsetHeight}px` : '面板未找到'
    });

    // ✅ 测试3：环境检测是否工作
    let env = null;
    if (window.MasterEngine && window.MasterEngine.detectEnvironment) {
        env = window.MasterEngine.detectEnvironment();
    }
    results.push({
        name: '环境检测功能正常',
        pass: env && env.nodeId,
        detail: env ? `节点: ${env.nodeId}, 时长: ${env.duration}s` : '环境检测返回null'
    });

    // ✅ 测试4：GM 存储读写（如果适用）
    if (window.GM_setValue && window.GM_getValue) {
        try {
            window.GM_setValue('test_key', 'test_value_' + Date.now());
            const val = window.GM_getValue('test_key');
            results.push({
                name: 'GM 存储读写',
                pass: val && val.includes('test_value_'),
                detail: `写入并读回: ${val}`
            });
        } catch (e) {
            results.push({
                name: 'GM 存储读写',
                pass: false,
                detail: `异常: ${e.message}`
            });
        }
    } else {
        results.push({
            name: 'GM 存储读写',
            pass: false,
            detail: 'GM 存储 API 不可用'
        });
    }

    // ✅ 测试5：引擎初始化
    const engineReady = window.MasterEngine && typeof window.MasterEngine.start === 'function';
    results.push({
        name: '引擎实例已初始化',
        pass: engineReady,
        detail: engineReady ? 'window.MasterEngine.start 可用' : '引擎未就绪'
    });

    // 将结果挂载到 window，供 AI 读取
    window.__TEST_RESULTS__ = results;

    // 输出到控制台
    console.log('\n=== 优雅大师 测试报告 ===');
    results.forEach(r => {
        const icon = r.pass ? '✅' : '❌';
        console.log(`${icon} ${r.name}: ${r.detail}`);
    });
    const passed = results.filter(r => r.pass).length;
    const total = results.length;
    console.log(`\n📊 通过率: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
    console.log(passed === total ? '\n✅ 所有测试通过！' : '\n⚠️  部分测试失败');

    return results;
}

// 3秒后自动运行测试
setTimeout(runTests, 3000);
