/**
 * detectEnvironment 函数单元测试
 * 测试 URL 检测逻辑（路径格式 vs 查询参数格式）
 */

// 模拟 location 对象
const mockLocations = [
    { href: 'https://scauzj.leykeji.com/user/node?nodeId=1429487', expected: { nodeId: '1429487', duration: 3600 } },
    { href: 'https://scauzj.leykeji.com/node/12345', expected: { nodeId: '12345', duration: 3600 } },
    { href: 'https://scauzj.leykeji.com/user/course?courseId=1011601', expected: null },
    { href: 'https://scauzj.leykeji.com/', expected: null },
];

// 模拟 detectEnvironment 函数
function detectEnvironment() {
    const pathMatch = location.pathname.match(/\/node\/(\d+)/);
    const params = new URLSearchParams(location.search);
    const paramNodeId = params.get("nodeId");
    let match = pathMatch;
    if (!match && paramNodeId) {
        match = {1: paramNodeId};
    }
    if (!match) return null;
    const nodeId = match[1];
    let duration = 0;
    const video = document.querySelector("video");
    if (video && video.duration && video.duration !== Infinity) {
        duration = Math.floor(video.duration);
    } else {
        const m = document.body.textContent.match(/(\d{1,2}):(\d{2})/);
        if (m) duration = parseInt(m[1]) * 60 + parseInt(m[2]);
    }
    if (!duration || duration <= 0) duration = 3600;
    return { nodeId, duration };
}

// 运行测试
console.log('=== detectEnvironment 单元测试 ===\n');

mockLocations.forEach((test, i) => {
    // 临时替换 location
    const originalLocation = window.location;
    const mockUrl = new URL(test.href);
    window.location = mockUrl;

    // 模拟 video 元素（null）
    const originalQuerySelector = document.querySelector.bind(document);
    document.querySelector = function(selector) {
        if (selector === 'video') return null;
        return originalQuerySelector(selector);
    };

    // 模拟 body 文本中的时长
    const originalTextContent = document.body.textContent;
    Object.defineProperty(document.body, 'textContent', {
        value: '07:20',
        writable: true
    });

    const result = detectEnvironment();
    const passed = result && result.nodeId === test.expected.nodeId;

    console.log(`测试 ${i+1}: ${test.href}`);
    console.log(`  期望: ${JSON.stringify(test.expected)}`);
    console.log(`  实际: ${JSON.stringify(result)}`);
    console.log(`  结果: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);

    // 恢复
    window.location = originalLocation;
    document.querySelector = originalQuerySelector;
    Object.defineProperty(document.body, 'textContent', { value: originalTextContent });
});
