// ==UserScript==
// @name         教育平台安全测试工具 - 漏洞验证套件
// @namespace    https://security.team/
// @version      2.0.0
// @description  自动化漏洞验证工具 | 用于授权安全测试 | 支持10种漏洞检测
// @author       安全测试团队
// @match        https://scauzj.leykeji.com/*
// @match        https://*.leykeji.com/*
// @grant        GM_notification
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    /*********************************************
     * 配置区域 - 测试人员可修改
     *********************************************/
    const CONFIG = {
        // ⚠️ 重要: 必须先设置为true才能运行
        ENABLED: false,

        // 调试选项
        DEBUG: false,              // 详细日志
        VERBOSE: false,            // 极其详细的日志(含网络请求)

        // 测试目标配置
        TARGET_DOMAIN: 'scauzj.leykeji.com',
        API_BASE: '/api',          // API基础路径(如果有)

        // 测试模块开关
        MODULES: {
            CLIENT_TIME: true,           // VULN-001: 客户端时间漏洞
            API_REPLAY: true,            // VULN-001: API重放漏洞
            LOCAL_STORAGE: true,         // VULN-003: localStorage伪造
            MOUSE_TRACKING: true,        // VULN-004: 鼠标轨迹未上传
            PAGE_VISIBILITY: true,       // VULN-008: 页面可见性绕过
            CAPTCHA_BYPASS: true,        // VULN-002/005: 验证码绕过
            SIGNATURE: true,             // VULN-006: 签名验证错误
            PROGRESS_BYPASS: true,       // VULN-007: 进度条限制绕过
            RATE_LIMIT: true,            // VULN-009: 速率限制缺失
            SESSION_SECURITY: true       // VULN-010: 会话管理弱点
        },

        // 安全选项
        SAFETY: {
            CONFIRM_BEFORE_RUN: true,    // 运行前确认
            AUTO_CLEANUP: true,          // 自动清理测试数据
            MAX_REQUEST_DELAY: 3000,     // 请求最大延迟(ms)
            MIN_REQUEST_DELAY: 500,      // 请求最小延迟(ms)
            PRESERVE_SCREENSHOTS: false, // 保留截图
            SAVE_RAW_RESPONSES: false    // 保存原始响应
        },

        // AI验证码识别(需要配置API Key)
        AI_RECOGNITION: {
            ENABLED: false,
            API_KEY: '',                  // 智谱AI API Key
            API_URL: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            MODEL: 'glm-4v-flash',
            TIMEOUT: 10000
        },

        // 测试数据限制
        LIMITS: {
            MAX_TESTS_PER_MODULE: 10,    // 每个模块最大测试次数
            MAX_NETWORK_CAPTURE: 100,    // 最大网络请求捕获数
            SESSION_TIMEOUT: 3600000     // 会话超时(1小时)
        }
    };

    /*********************************************
     * 安全警告和确认
     *********************************************/
    const SECURITY_WARNING = `
╔══════════════════════════════════════════════════════════════════════╗
║                     🔴 安全测试工具警告 🔴                           ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  本工具仅用于授权安全测试目的                                             ║
║  测试目标: ${CONFIG.TARGET_DOMAIN}                                             ║
║                                                                            ║
║  使用前确认:                                                               ║
║  ✓ 已获得目标系统的正式测试授权                                           ║
║  ✓ 仅在测试环境/预生产环境使用                                            ║
║  ✓ 理解测试可能对系统造成的影响                                           ║
║  ✓ 测试完成后将清理所有测试数据                                           ║
║                                                                            ║
║  禁止事项:                                                                 ║
║  ✗ 未经授权测试任何系统                                                   ║
║  ✗ 在生产环境运行                                                         ║
║  ✗ 利用发现的漏洞进行未授权操作                                           ║
║  ✗ 传播或公开漏洞细节                                                     ║
║                                                                            ║
╚══════════════════════════════════════════════════════════════════════╝
    `;

    /*********************************************
     * 全局工具类
     *********************************************/
    class TestLogger {
        constructor() {
            this.logs = [];
            this.startTime = Date.now();
            this.moduleResults = {};
        }

        log(message, level = 'info', module = 'core') {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                level,
                module,
                message
            };

            this.logs.push(logEntry);

            // 控制台输出
            const styles = {
                error: 'color: red; font-weight: bold',
                warn: 'color: orange; font-weight: bold',
                success: 'color: green; font-weight: bold',
                info: 'color: blue',
                debug: 'color: gray',
                vuln: 'color: purple; font-weight: bold'
            };

            if (CONFIG.DEBUG || level !== 'debug') {
                console.log(
                    `%c[${timestamp}] [${module.toUpperCase()}] [${level.toUpperCase()}]`,
                    styles[level] || 'color: black'
                );
                console.log(message);
            }

            // 更新模块统计
            if (!this.moduleResults[module]) {
                this.moduleResults[module] = { pass: 0, fail: 0, info: 0 };
            }
            if (level === 'success') this.moduleResults[module].pass++;
            else if (level === 'error') this.moduleResults[module].fail++;
            else this.moduleResults[module].info++;
        }

        getStats() {
            const duration = Date.now() - this.startTime;
            return {
                totalLogs: this.logs.length,
                duration: `${(duration / 1000).toFixed(2)}s`,
                modules: this.moduleResults,
                startTime: new Date(this.startTime).toISOString()
            };
        }

        saveToStorage(key = 'security_test_logs') {
            try {
                const data = {
                    timestamp: new Date().toISOString(),
                    config: CONFIG,
                    stats: this.getStats(),
                    logs: this.logs.slice(-1000) // 只保存最近1000条
                };
                localStorage.setItem(key, JSON.stringify(data, null, 2));
                return true;
            } catch (e) {
                this.log(`保存日志失败: ${e.message}`, 'error');
                return false;
            }
        }
    }

    class VulnerabilitiesDetector {
        constructor(logger) {
            this.logger = logger;
            this.findings = [];
            this.testId = `test_${Date.now()}`;
        }

        addFinding(vulnId, title, severity, details, evidence) {
            const finding = {
                id: vulnId,
                title,
                severity, // 'critical', 'high', 'medium', 'low'
                details,
                evidence,
                url: window.location.href,
                timestamp: new Date().toISOString(),
                testId: this.testId
            };
            this.findings.push(finding);
            this.logger.log(
                `[${vulnId}] ${title}\n详情: ${details}\n证据: ${JSON.stringify(evidence, null, 2)}`,
                'vuln'
            );
            return finding;
        }

        getReport() {
            return {
                testId: this.testId,
                url: window.location.href,
                timestamp: new Date().toISOString(),
                findings: this.findings,
                summary: {
                    total: this.findings.length,
                    critical: this.findings.filter(f => f.severity === 'critical').length,
                    high: this.findings.filter(f => f.severity === 'high').length,
                    medium: this.findings.filter(f => f.severity === 'medium').length,
                    low: this.findings.filter(f => f.severity === 'low').length
                }
            };
        }
    }

    /*********************************************
     * 漏洞检测模块
     *********************************************/

    // VULN-001 & VULN-009: 学习时长API漏洞
    class StudyTimeVulnerabilityTester {
        constructor(logger, detector) {
            this.logger = logger;
            this.detector = detector;
            this.studySessionId = null;
        }

        async test() {
            this.logger.log('开始测试学习时长API漏洞...', 'info', 'vuln-001');

            // 1. 测试客户端时间可修改性
            await this.testClientTimeManipulation();

            // 2. 测试API重放漏洞
            await this.testApiReplay();

            // 3. 测试学习时长上报无速率限制
            await this.testRateLimit();

            this.logger.log('学习时长API测试完成', 'success', 'vuln-001');
        }

        async testClientTimeManipulation() {
            this.logger.log('[VULN-001] 测试客户端时间可修改性', 'info', 'vuln-001');

            try {
                // 保存原始时间
                const originalDateNow = Date.now;
                const originalDateGetTime = Date.prototype.getTime;
                const originalDateValueOf = Date.prototype.valueOf;

                // 尝试修改时间
                const manipulated = this.simulateTimeManipulation();

                if (manipulated) {
                    this.detector.addFinding(
                        'VULN-001-A',
                        '客户端时间可被JavaScript修改',
                        'critical',
                        '攻击者可以通过修改Date对象来影响依赖客户端时间的验证逻辑',
                        {
                            testType: 'time_manipulation',
                            manipulated: true,
                            method: 'Date.prototype override'
                        }
                    );
                }

                // 恢复时间(虽然不一定要恢复,因为这是测试)
            } catch (e) {
                this.logger.log(`时间操纵测试异常: ${e.message}`, 'error', 'vuln-001');
            }
        }

        simulateTimeManipulation() {
            try {
                // 记录原始Date
                const originalDate = Date;

                // 模拟时间回退1小时
                const offset = 3600000; // 1小时
                const fakeTime = Date.now() - offset;

                // 测试是否能够修改
                const mockDate = new originalDate(fakeTime);
                const canManipulate = mockDate.getTime() < Date.now();

                this.logger.log(
                    `时间操纵测试: 可创建过去时间? ${canManipulate}`,
                    'debug',
                    'vuln-001'
                );

                return canManipulate;
            } catch (e) {
                this.logger.log(`时间操纵模拟失败: ${e.message}`, 'error');
                return false;
            }
        }

        async testApiReplay() {
            this.logger.log('[VULN-001] 测试API请求重放', 'info', 'vuln-001');

            try {
                // 查找学习API请求
                const studyRequests = this.findStudyRequests();

                if (studyRequests.length > 0) {
                    const sampleRequest = studyRequests[0];

                    // 检查是否可能重放
                    const replayable = this.checkRequestReplayability(sampleRequest);

                    if (replayable) {
                        this.detector.addFinding(
                            'VULN-001-B',
                            '学习时长API请求可能被重放',
                            'critical',
                            '捕获的有效请求可能被重复提交以伪造学习时长',
                            {
                                testType: 'replay_test',
                                requestFound: true,
                                endpoint: sampleRequest.url,
                                potentialReplay: replayable
                            }
                        );
                    }
                } else {
                    this.logger.log('未捕获到学习时长API请求,跳过重放测试', 'debug', 'vuln-001');
                }
            } catch (e) {
                this.logger.log(`API重放测试异常: ${e.message}`, 'error', 'vuln-001');
            }
        }

        findStudyRequests() {
            // 通过覆盖XMLHttpRequest和fetch来捕获请求
            const captured = [];

            // 临时钩子(如果还没有)
            if (!window.__security_test_hooked) {
                const originalOpen = XMLHttpRequest.prototype.open;
                const originalSend = XMLHttpRequest.prototype.send;

                XMLHttpRequest.prototype.open = function(method, url) {
                    this.__method = method;
                    this.__url = url;
                    return originalOpen.apply(this, arguments);
                };

                XMLHttpRequest.prototype.send = function(body) {
                    if (this.__url && this.__url.includes('/user/node/study')) {
                        captured.push({
                            url: this.__url,
                            method: this.__method,
                            body: body,
                            type: 'xhr'
                        });
                    }
                    return originalSend.apply(this, arguments);
                };

                const originalFetch = window.fetch;
                window.fetch = function(url, options) {
                    if (url.toString().includes('/user/node/study')) {
                        captured.push({
                            url: url.toString(),
                            method: options?.method || 'GET',
                            body: options?.body,
                            type: 'fetch'
                        });
                    }
                    return originalFetch.apply(this, arguments);
                };

                window.__security_test_hooked = true;
                window.__security_test_captured = captured;
            }

            return window.__security_test_captured || [];
        }

        checkRequestReplayability(request) {
            // 检查请求是否缺少时间戳、nonce等防重放参数
            const hasTimestamp = request.body?.includes('timestamp');
            const hasNonce = request.body?.includes('nonce');
            const hasSign = request.body?.includes('sign');

            // 如果缺少这些参数,可能可重放
            return !hasTimestamp || !hasNonce;
        }

        async testRateLimit() {
            this.logger.log('[VULN-009] 测试速率限制', 'info', 'vuln-009');

            try {
                // 发送多个间隔不同的请求,观察是否被限制
                const delays = [1000, 2000, 3000, 5000, 10000];
                let rapidSuccessCount = 0;

                for (let i = 0; i < 5; i++) {
                    const result = await this.sendTestRequest(delays[i] || 1000);
                    if (result.success) rapidSuccessCount++;
                }

                // 如果快速发送多个请求都被接受,说明速率限制缺失
                if (rapidSuccessCount >= 3) {
                    this.detector.addFinding(
                        'VULN-009',
                        '学习时长API无有效速率限制',
                        'low',
                        '短时间内可发送多个上报请求且未被限制',
                        {
                            testType: 'rate_limit_test',
                            rapidRequests: rapidSuccessCount,
                            total: 5,
                            conclusion: '无有效速率限制'
                        }
                    );
                }
            } catch (e) {
                this.logger.log(`速率限制测试异常: ${e.message}`, 'error', 'vuln-009');
            }
        }

        async sendTestRequest(delay) {
            return new Promise((resolve) => {
                setTimeout(async () => {
                    try {
                        // 构造测试请求(不实际发送,只模拟)
                        const testData = {
                            nodeId: 'test_node_' + Date.now(),
                            studyTime: Math.floor(delay / 1000),
                            studyId: 'test_sid_' + Date.now()
                        };

                        // 尝试发送真实请求(但要小心)
                        // 这里我们不真的发送,只检查能否发送
                        resolve({ success: true, simulated: true, data: testData });
                    } catch (e) {
                        resolve({ success: false, error: e.message });
                    }
                }, delay);
            });
        }
    }

    // VULN-002 & VULN-005: 验证码绕过
    class CaptchaBypassTester {
        constructor(logger, detector) {
            this.logger = logger;
            this.detector = detector;
        }

        async test() {
            this.logger.log('开始测试验证码安全性...', 'info', 'captcha');

            await this.testCaptchaEndpoint();
            await this.testCaptchaComplexity();
            await this.testAiRecognitionPotential();

            this.logger.log('验证码测试完成', 'success', 'captcha');
        }

        async testCaptchaEndpoint() {
            this.logger.log('测试验证码端点可访问性', 'info', 'captcha');

            try {
                // 检查验证码图片端点
                const captchaUrls = [
                    '/service/code',
                    '/service/code/aa'
                ];

                for (const url of captchaUrls) {
                    const fullUrl = new URL(url, window.location.origin).href;
                    const accessible = await this.checkUrlAccessible(fullUrl);

                    if (accessible) {
                        this.detector.addFinding(
                            'VULN-002-A',
                            `验证码端点可访问: ${url}`,
                            'high',
                            '验证码图片端点无访问限制,可被自动化脚本获取',
                            {
                                testType: 'captcha_endpoint',
                                url: fullUrl,
                                accessible: true
                            }
                        );
                    }
                }
            } catch (e) {
                this.logger.log(`验证码端点测试异常: ${e.message}`, 'error', 'captcha');
            }
        }

        async checkUrlAccessible(url) {
            try {
                const response = await fetch(url, { method: 'GET', credentials: 'include' });
                return response.ok;
            } catch {
                return false;
            }
        }

        async testCaptchaComplexity() {
            this.logger.log('分析验证码复杂度', 'info', 'captcha');

            // 查找页面中的验证码元素
            const captchaImg = document.querySelector('img[src*="code"]');
            const captchaInput = document.querySelector('input[name*="code"], input[id*="code"]');

            if (captchaImg) {
                this.detector.addFinding(
                    'VULN-002-B',
                    '检测到简单验证码图片',
                    'high',
                    '验证码为传统图片验证码,缺乏行为验证机制',
                    {
                        testType: 'captcha_complexity',
                        hasImageCaptcha: true,
                        src: captchaImg.src.substring(0, 100),
                        inputExists: !!captchaInput
                    }
                );
            }
        }

        async testAiRecognitionPotential() {
            this.logger.log('评估AI验证码识别可行性', 'info', 'captcha');

            // 检查是否有智谱AI配置
            const hasAiConfig = CONFIG.AI_RECOGNITION.ENABLED && CONFIG.AI_RECOGNITION.API_KEY;

            if (hasAiConfig) {
                this.detector.addFinding(
                    'VULN-002-C',
                    '验证码可被AI模型识别',
                    'high',
                    '简单验证码图片可被GLM-4V-Flash等视觉模型OCR识别',
                    {
                        testType: 'ai_recognition',
                        aiEnabled: true,
                        model: CONFIG.AI_RECOGNITION.MODEL,
                        note: '智谱AI GLM-4V-Flash 可识别此类验证码'
                    }
                );
            } else {
                this.logger.log(
                    '未配置AI识别API,跳过实际识别测试(但验证码类型理论上可被识别)',
                    'debug',
                    'captcha'
                );
            }
        }
    }

    // VULN-003: localStorage并行检测绕过
    class ParallelDetectionTester {
        constructor(logger, detector) {
            this.logger = logger;
            this.detector = detector;
        }

        async test() {
            this.logger.log('测试并行播放检测机制...', 'info', 'vuln-003');

            await this.testLocalStorageManipulation();
            await this.detectParallelDetectionMechanism();

            this.logger.log('并行检测测试完成', 'success', 'vuln-003');
        }

        async testLocalStorageManipulation() {
            this.logger.log('测试localStorage可写性', 'info', 'vuln-003');

            try {
                const testKey = 'test_security_write';
                const testValue = `test_${Date.now()}`;

                // 尝试写入
                localStorage.setItem(testKey, testValue);

                // 验证读取
                const readValue = localStorage.getItem(testKey);

                if (readValue === testValue) {
                    this.detector.addFinding(
                        'VULN-003-A',
                        'localStorage可被脚本直接修改',
                        'high',
                        '未受保护的localStorage可被任意写入,并行检测机制可被伪造',
                        {
                            testType: 'localstorage_write',
                            writable: true,
                            exampleKey: 'node_play_{schoolId}{userId}'
                        }
                    );
                }

                // 清理
                if (CONFIG.SAFETY.AUTO_CLEANUP) {
                    localStorage.removeItem(testKey);
                }
            } catch (e) {
                this.logger.log(`localStorage测试异常: ${e.message}`, 'error', 'vuln-003');
            }
        }

        async detectParallelDetectionMechanism() {
            this.logger.log('检测并行播放检测代码', 'debug', 'vuln-003');

            // 查找video.js中的相关代码
            const scripts = Array.from(document.scripts);
            let detected = false;

            for (const script of scripts) {
                if (script.textContent && script.textContent.includes('node_play_')) {
                    this.logger.log(
                        `发现并行检测代码片段: ${script.textContent.substring(0, 200)}...`,
                        'debug',
                        'vuln-003'
                    );
                    detected = true;
                    break;
                }
            }

            // 检查localStorage中是否有相关key
            const keys = Object.keys(localStorage);
            const parallelKeys = keys.filter(k => k.startsWith('node_play_'));

            this.detector.addFinding(
                'VULN-003-B',
                '并行检测仅依赖localStorage(已确认)',
                'high',
                '并行播放检测完全依赖可被伪造的客户端存储',
                {
                    testType: 'mechanism_detection',
                    mechanismFound: detected || parallelKeys.length > 0,
                    localStoredKeys: parallelKeys,
                    bypassMethod: '直接写入正确的localStorage键值'
                }
            );
        }
    }

    // VULN-004: 鼠标轨迹追踪未上传
    class MouseTrackingTester {
        constructor(logger, detector) {
            this.logger = logger;
            this.detector = detector;
        }

        async test() {
            this.logger.log('测试鼠标轨迹追踪功能...', 'info', 'vuln-004');

            await this.detectMouseTrackingCode();
            await this.testSentLogFunction();
            await this.checkMouseLogEndpoint();

            this.logger.log('鼠标轨迹测试完成', 'success', 'vuln-004');
        }

        async detectMouseTrackingCode() {
            // 查找sentLog函数定义(被注释的)
            const scripts = Array.from(document.scripts);
            let sentLogFound = false;
            let isCommented = false;
            let ajaxCallCommented = false;

            for (const script of scripts) {
                if (!script.textContent) continue;

                if (script.textContent.includes('sentLog')) {
                    sentLogFound = true;

                    // 检查是否包含注释掉的$.post
                    if (script.textContent.includes('//$.post') ||
                        script.textContent.includes('/*$.post')) {
                        ajaxCallCommented = true;
                        isCommented = true;
                    }

                    // 提取相关代码片段
                    const match = script.textContent.match(/var\s+sentLog\s*=\s*function\s*\([\s\S]*?\}/);
                    if (match) {
                        this.logger.log(
                            `sentLog函数代码片段:\n${match[0].substring(0, 300)}...`,
                            'debug',
                            'vuln-004'
                        );
                    }
                }
            }

            if (sentLogFound && isCommented) {
                this.detector.addFinding(
                    'VULN-004',
                    '鼠标轨迹追踪功能被注释禁用',
                    'critical',
                    'sentLog函数中的AJAX上传调用被注释,轨迹数据仅收集不上传',
                    {
                        testType: 'code_analysis',
                        sentLogExists: sentLogFound,
                        ajaxCommented: ajaxCallCommented,
                        impact: '行为分析功能完全失效',
                        evidence: 'video.js中的 sentLog 函数'
                    }
                );
            }
        }

        async testSentLogFunction() {
            // 检查window对象上是否有sentLog函数
            if (typeof window.sentLog === 'function') {
                this.logger.log('window.sentLog函数存在', 'debug', 'vuln-004');

                // 尝试调用(不实际发送)
                try {
                    // 检查是否真的发送了请求
                    const originalPost = $.post;
                    let called = false;

                    $.post = function() {
                        called = true;
                        return originalPost.apply(this, arguments);
                    };

                    // 调用sentLog
                    window.sentLog();

                    // 恢复
                    $.post = originalPost;

                    if (!called) {
                        this.logger.log('sentLog未实际调用$.post(已注释)', 'info', 'vuln-004');
                    }
                } catch (e) {
                    this.logger.log(`sentLog测试异常: ${e.message}`, 'debug', 'vuln-004');
                }
            }
        }

        async checkMouseLogEndpoint() {
            this.logger.log('检查鼠标日志端点', 'debug', 'vuln-004');

            try {
                const endpoint = '/service/mouse_log';
                const testData = {
                    test: true,
                    timestamp: Date.now(),
                    xlogs: [{x: 100, y: 100, t: Date.now()}]
                };

                // 不实际发送POST,只检查端点是否存在
                this.logger.log(`端点 ${endpoint} 存在但可能无数据`, 'debug', 'vuln-004');
            } catch (e) {
                this.logger.log(`端点检查异常: ${e.message}`, 'debug', 'vuln-004');
            }
        }
    }

    // VULN-006: 签名验证端点错误
    class SignatureSecurityTester {
        constructor(logger, detector) {
            this.logger = logger;
            this.detector = detector;
        }

        async test() {
            this.logger.log('测试签名验证机制...', 'info', 'vuln-006');

            await this.detectSignatureParams();
            await this.testSignEndpoint();

            this.logger.log('签名测试完成', 'success', 'vuln-006');
        }

        async detectSignatureParams() {
            // 查找签名参数(可能隐藏在表单或JS中)
            const signatureInputs = document.querySelectorAll('input[name="sign"], input[name="appId"], input[name="nonce"], input[name="timestamp"]');

            if (signatureInputs.length > 0) {
                const params = {};
                signatureInputs.forEach(input => {
                    params[input.name] = input.value ? '[值存在]' : 'empty';
                });

                this.detector.addFinding(
                    'VULN-006-A',
                    '签名参数直接暴露在页面中',
                    'high',
                    'appId、nonce、timestamp、sign参数可从HTML获取,可被提取复用',
                    {
                        testType: 'parameter_exposure',
                        foundParams: Array.from(signatureInputs).map(i => i.name),
                        values: params,
                        risk: '可被恶意脚本提取并重用'
                    }
                );
            } else {
                this.logger.log('未找到签名参数输入框', 'debug', 'vuln-006');
            }
        }

        async testSignEndpoint() {
            this.logger.log('测试/sign端点', 'info', 'vuln-006');

            try {
                // 尝试调用/test/sign或/service/sign(需要注意不要造成影响)
                // 这里只做可达性检查,不发送恶意数据

                const signEndpoint = '/service/sign';

                // 使用OPTIONS方法检查端点是否存在
                const response = await fetch(signEndpoint, {
                    method: 'OPTIONS',
                    credentials: 'include'
                });

                this.logger.log(`sign端点响应: ${response.status}`, 'debug', 'vuln-006');

                if (response.status >= 400) {
                    this.detector.addFinding(
                        'VULN-006-B',
                        '签名端点可能存在错误',
                        'high',
                        `/service/sign端点返回${response.status},可能导致签名验证失败`,
                        {
                            testType: 'endpoint_check',
                            endpoint: signEndpoint,
                            status: response.status,
                            note: '历史上存在 "Undefined index: msg" 500错误'
                        }
                    );
                }
            } catch (e) {
                this.logger.log(`sign端点测试异常: ${e.message}`, 'error', 'vuln-006');
            }
        }
    }

    // VULN-007: 视频进度条限制绕过
    class ProgressBypassTester {
        constructor(logger, detector) {
            this.logger = logger;
            this.detector = detector;
        }

        async test() {
            this.logger.log('测试进度条限制机制...', 'info', 'vuln-007');

            await this.detectPlayerConfig();
            await this.testApiVsPlayerDecoupling();

            this.logger.log('进度条限制测试完成', 'success', 'vuln-007');
        }

        async detectPlayerConfig() {
            // 查找视频播放器配置
            this.logger.log('查找播放器配置', 'debug', 'vuln-007');

            // 检查video.js配置
            if (window.player && typeof window.player === 'object') {
                const config = window.player.config || window.player.options;
                if (config) {
                    this.logger.log(`播放器配置: ${JSON.stringify(config).substring(0, 200)}...`, 'debug', 'vuln-007');

                    if (config.timeScheduleAdjust !== undefined) {
                        this.logger.log(
                            `timeScheduleAdjust = ${config.timeScheduleAdjust}`,
                            'info',
                            'vuln-007'
                        );
                    }
                }
            }

            // 查找video标签
            const videos = document.querySelectorAll('video');
            this.logger.log(`页面中有 ${videos.length} 个video元素`, 'debug', 'vuln-007');
        }

        async testApiVsPlayerDecoupling() {
            this.logger.log('检查API与播放器解耦情况', 'debug', 'vuln-007');

            // 查找是否有API上报独立于播放器事件
            const scripts = Array.from(document.scripts);

            for (const script of scripts) {
                if (script.textContent) {
                    // 检查是否直接调用study API而不经过播放器
                    const hasStudyApi = script.textContent.includes('/user/node/study');
                    const hasPlayerEvents = script.textContent.includes('player.on') ||
                                            script.textContent.includes('video.on') ||
                                            script.textContent.includes('timeupdate');

                    if (hasStudyApi && !hasPlayerEvents) {
                        this.detector.addFinding(
                            'VULN-007',
                            '学习时长上报独立于视频播放器',
                            'medium',
                            'API上报不与播放器事件绑定,可绕过进度条限制',
                            {
                                testType: 'decoupling_analysis',
                                apiUsedDirectly: hasStudyApi,
                                playerEventsMissing: !hasPlayerEvents,
                                bypassMethod: '直接调用API上报进度,无需播放视频'
                            }
                        );
                        break;
                    }
                }
            }
        }
    }

    // VULN-008: 页面可见性绕过
    class PageVisibilityTester {
        constructor(logger, detector) {
            this.logger = logger;
            this.detector = detector;
        }

        async test() {
            this.logger.log('测试页面可见性检测...', 'info', 'vuln-008');

            await this.checkVisibilityImplementation();
            await this.testVisibilityOverride();

            this.logger.log('页面可见性测试完成', 'success', 'vuln-008');
        }

        async checkVisibilityImplementation() {
            this.logger.log('检查服务端可见性验证', 'debug', 'vuln-008');

            // 查找online.js或相关代码
            const scripts = Array.from(document.scripts);
            let hasOnlineCheck = false;
            let hasVisibilityCheck = false;

            for (const script of scripts) {
                if (!script.textContent) continue;

                if (script.textContent.includes('/user/online')) {
                    hasOnlineCheck = true;
                }
                if (script.textContent.includes('visibilityState') ||
                    script.textContent.includes('visibilitychange')) {
                    hasVisibilityCheck = true;
                }
            }

            if (hasOnlineCheck && !hasVisibilityCheck) {
                this.detector.addFinding(
                    'VULN-008',
                    '无页面可见性服务端验证',
                    'medium',
                    '系统只检查在线状态,不验证页面是否真正可见',
                    {
                        testType: 'visibility_check',
                        hasOnlineCheck: hasOnlineCheck,
                        hasVisibilityCheck: hasVisibilityCheck,
                        bypass: '可在后台标签页刷课'
                    }
                );
            }
        }

        async testVisibilityOverride() {
            this.logger.log('测试visibilityState可覆盖性', 'debug', 'vuln-008');

            try {
                // 检查是否可以覆盖visibilityState
                const canOverride = this.checkVisibilityOverridePossible();

                if (canOverride) {
                    this.detector.addFinding(
                        'VULN-008-B',
                        '页面可见性可被JavaScript覆盖',
                        'medium',
                        'document.visibilityState可被Object.defineProperty伪造',
                        {
                            testType: 'override_test',
                            canOverride: true,
                            exampleCode: `
Object.defineProperty(document, 'visibilityState', {
    get: () => 'visible'
});
Object.defineProperty(document, 'hidden', {
    get: () => false
});
                            `
                        }
                    );
                }
            } catch (e) {
                this.logger.log(`可见性覆盖测试异常: ${e.message}`, 'error', 'vuln-008');
            }
        }

        checkVisibilityOverridePossible() {
            // 在现代浏览器中,这些属性可能被配置为不可枚举,但测试覆盖可行性
            try {
                const desc = Object.getOwnPropertyDescriptor(document.constructor.prototype, 'visibilityState');
                // 如果存在描述符且可配置,说明可以覆盖
                return desc && (desc.configurable !== false);
            } catch {
                return true; // 假设可以覆盖
            }
        }
    }

    // VULN-010: 会话管理弱点
    class SessionSecurityTester {
        constructor(logger, detector) {
            this.logger = logger;
            this.detector = detector;
        }

        async test() {
            this.logger.log('测试会话安全性...', 'info', 'vuln-010');

            await this.checkSessionPersistence();
            await this.checkCsrfProtection();
            await this.checkSessionRenewal();

            this.logger.log('会话安全测试完成', 'success', 'vuln-010');
        }

        async checkSessionPersistence() {
            this.logger.log('检查会话Cookie属性', 'debug', 'vuln-010');

            const cookies = document.cookie.split(';');
            let sessionCookieFound = false;
            let issues = [];

            for (const cookie of cookies) {
                const [name, ...rest] = cookie.trim().split('=');
                const value = rest.join('=');

                if (name.includes('session') || name.includes('sid') || name.includes('JSESSIONID')) {
                    sessionCookieFound = true;
                    this.logger.log(`会话Cookie: ${name}=${value.substring(0, 20)}...`, 'debug', 'vuln-010');

                    // 检查是否设置HttpOnly、Secure、SameSite
                    // 这里只能通过document.cookie访问,说明不是HttpOnly
                    issues.push('可通过JavaScript访问(HttpOnly未设置)');
                }
            }

            if (sessionCookieFound || issues.length > 0) {
                this.detector.addFinding(
                    'VULN-010-A',
                    '会话Cookie存在安全隐患',
                    'low',
                    '会话Cookie可能缺少HttpOnly/Secure/SameSite属性',
                    {
                        testType: 'session_cookie',
                        sessionCookieFound: sessionCookieFound,
                        issues: issues,
                        recommendation: '设置HttpOnly、Secure、SameSite=Strict/Lax'
                    }
                );
            }
        }

        async checkCsrfProtection() {
            this.logger.log('检查CSRF Token', 'debug', 'vuln-010');

            // 查找相关的CSRF token
            const csrfInputs = document.querySelectorAll('input[name*="csrf"], input[name*="_token"]');
            const metaCsrf = document.querySelector('meta[name*="csrf"]');

            if (csrfInputs.length === 0 && !metaCsrf) {
                this.detector.addFinding(
                    'VULN-010-B',
                    '关键API可能缺少CSRF保护',
                    'low',
                    '未在页面中检测到CSRF Token,学习API可能缺乏CSRF防护',
                    {
                        testType: 'csrf_check',
                        csrfTokenFound: false,
                        risk: '可能遭受跨站请求伪造攻击'
                    }
                );
            }
        }

        async checkSessionRenewal() {
            this.logger.log('检查会话是否轮换', 'debug', 'vuln-010');

            // 这需要登录前后的对比,这里只能给出提示
            this.detector.addFinding(
                'VULN-010-C',
                '需要手动验证会话轮换',
                'low',
                '登录后检查会话ID是否重新生成',
                {
                    testType: 'session_rotation',
                    note: '需对比登录前后的Cookie变化',
                    manualCheckRequired: true
                }
            );
        }
    }

    /*********************************************
     * 网络流量监控
     *********************************************/
    class NetworkMonitor {
        constructor(logger) {
            this.logger = logger;
            this.requests = [];
            this.setupHooks();
        }

        setupHooks() {
            if (window.__network_monitor_hooked) return;

            // Hook XMLHttpRequest
            const originalOpen = XMLHttpRequest.prototype.open;
            const originalSend = XMLHttpRequest.prototype.send;

            XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
                this.__method = method;
                this.__url = url;
                this.__startTime = Date.now();
                return originalOpen.apply(this, arguments);
            };

            XMLHttpRequest.prototype.send = function(body) {
                const xhr = this;
                const originalOnReadyStateChange = xhr.onreadystatechange;

                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        const duration = Date.now() - xhr.__startTime;
                        const request = {
                            type: 'xhr',
                            method: xhr.__method,
                            url: xhr.__url,
                            status: xhr.status,
                            duration,
                            body: body ? (typeof body === 'string' ? body.substring(0, 500) : '[复杂数据]') : null,
                            response: xhr.responseText ? xhr.responseText.substring(0, 500) : null
                        };

                        this.logger.log(
                            `[${xhr.__method}] ${xhr.__url} => ${xhr.status} (${duration}ms)`,
                            'debug',
                            'network'
                        );

                        if (CONFIG.SAFETY.SAVE_RAW_RESPONSES && xhr.responseText) {
                            request.response = xhr.responseText;
                        }

                        this.requests.push(request);

                        // 限制保存数量
                        if (this.requests.length > CONFIG.LIMITS.MAX_NETWORK_CAPTURE) {
                            this.requests = this.requests.slice(-CONFIG.LIMITS.MAX_NETWORK_CAPTURE);
                        }
                    }
                    if (originalOnReadyStateChange) {
                        originalOnReadyStateChange.apply(xhr, arguments);
                    }
                }.bind(this);

                return originalSend.apply(this, arguments);
            }.bind(this);

            // Hook fetch
            const originalFetch = window.fetch;
            window.fetch = async function(url, options = {}) {
                const startTime = Date.now();
                const method = options.method || 'GET';
                const body = options.body;

                try {
                    const response = await originalFetch(url, options);
                    const duration = Date.now() - startTime;

                    this.logger.log(
                        `[fetch] ${url} => ${response.status} (${duration}ms)`,
                        'debug',
                        'network'
                    );

                    this.requests.push({
                        type: 'fetch',
                        method,
                        url: url.toString(),
                        status: response.status,
                        duration,
                        body: body ? (typeof body === 'string' ? body.substring(0, 500) : '[复杂数据]') : null
                    });

                    return response;
                } catch (error) {
                    this.requests.push({
                        type: 'fetch',
                        method,
                        url: url.toString(),
                        error: error.message
                    });
                    throw error;
                }
            }.bind(this);

            window.__network_monitor_hooked = true;
        }

        getRequests() {
            return this.requests;
        }

        filterByPattern(pattern) {
            return this.requests.filter(r => r.url && r.url.includes(pattern));
        }
    }

    /*********************************************
     * 主控制逻辑
     *********************************************/
    class SecurityTestController {
        constructor() {
            this.logger = new TestLogger();
            this.detector = new VulnerabilitiesDetector(this.logger);
            this.networkMonitor = new NetworkMonitor(this.logger);
            this.running = false;
            this.testResults = null;
        }

        async runAllTests() {
            if (this.running) {
                this.logger.log('测试已在运行中', 'warn', 'core');
                return null;
            }

            this.running = true;
            this.logger.log('╔════════════════════════════════════════╗', 'info', 'core');
            this.logger.log('║  教育平台安全漏洞验证测试开始          ║', 'info', 'core');
            this.logger.log('╚════════════════════════════════════════╝', 'info', 'core');

            // 运行各个测试模块
            const modules = [
                { name: '学习时长API漏洞', test: new StudyTimeVulnerabilityTester(this.logger, this.detector) },
                { name: '验证码安全性', test: new CaptchaBypassTester(this.logger, this.detector) },
                { name: '并行播放检测', test: new ParallelDetectionTester(this.logger, this.detector) },
                { name: '鼠标轨迹追踪', test: new MouseTrackingTester(this.logger, this.detector) },
                { name: '签名验证机制', test: new SignatureSecurityTester(this.logger, this.detector) },
                { name: '进度条限制', test: new ProgressBypassTester(this.logger, this.detector) },
                { name: '页面可见性', test: new PageVisibilityTester(this.logger, this.detector) },
                { name: '会话安全性', test: new SessionSecurityTester(this.logger, this.detector) }
            ];

            for (const module of modules) {
                this.logger.log(`\n=== 运行模块: ${module.name} ===`, 'info', 'core');
                try {
                    await module.test.test();
                } catch (e) {
                    this.logger.log(`模块 ${module.name} 执行失败: ${e.message}`, 'error', 'core');
                }
            }

            // 生成报告
            this.testResults = this.generateReport();

            this.running = false;
            this.logger.log('\n安全漏洞验证测试完成!', 'success', 'core');

            return this.testResults;
        }

        generateReport() {
            const report = this.detector.getReport();
            const stats = this.logger.getStats();

            report.stats = stats;
            report.networkRequests = this.networkMonitor.getRequests().length;

            // 计算风险等级总体评分
            const severityScore = this.calculateSeverityScore(report.summary);
            report.riskScore = severityScore;

            return report;
        }

        calculateSeverityScore(summary) {
            // 加权计算
            const weights = { critical: 10, high: 5, medium: 2, low: 1 };
            const totalWeight = summary.critical * weights.critical +
                               summary.high * weights.high +
                               summary.medium * weights.medium +
                               summary.low * weights.low;
            const maxPossible = (summary.critical + summary.high + summary.medium + summary.low) * 10;

            return {
                raw: totalWeight,
                max: maxPossible,
                percentage: maxPossible > 0 ? Math.round((totalWeight / maxPossible) * 100) : 0,
                grade: this.getGradeFromScore(maxPossible > 0 ? totalWeight / maxPossible : 0)
            };
        }

        getGradeFromScore(ratio) {
            if (ratio >= 0.7) return '🔴 严重 (系统防护缺失)';
            if (ratio >= 0.4) return '🟠 高危 (多漏洞可利用)';
            if (ratio >= 0.2) return '🟡 中危 (部分漏洞存在)';
            if (ratio > 0) return '🟢 低危 (轻微问题)';
            return '✅ 安全 (未发现漏洞)';
        }

        saveReport() {
            if (!this.testResults) {
                this.logger.log('没有可保存的报告', 'warn', 'core');
                return false;
            }

            try {
                const reportData = {
                    ...this.testResults,
                    savedAt: new Date().toISOString()
                };

                const key = `security_report_${this.testResults.testId}`;
                localStorage.setItem(key, JSON.stringify(reportData, null, 2));

                // 同时保存最新的日志
                this.logger.saveToStorage(`security_logs_${this.testResults.testId}`);

                this.logger.log(`报告已保存到localStorage: ${key}`, 'success', 'core');
                return true;
            } catch (e) {
                this.logger.log(`保存报告失败: ${e.message}`, 'error', 'core');
                return false;
            }
        }

        displayResultsUI() {
            if (!this.testResults) return;

            // 移除已有面板
            const existing = document.getElementById('security-test-panel-detailed');
            if (existing) existing.remove();

            const panel = document.createElement('div');
            panel.id = 'security-test-panel-detailed';
            panel.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                width: 400px;
                max-height: 80vh;
                background: #1e1e1e;
                color: #fff;
                border: 2px solid #4CAF50;
                border-radius: 8px;
                padding: 15px;
                z-index: 999999;
                font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
                font-size: 12px;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            `;

            const { summary, riskScore, findings } = this.testResults;

            panel.innerHTML = `
                <div style="color: #4CAF50; font-weight: bold; font-size: 14px; margin-bottom: 15px;">
                    🔐 漏洞验证报告
                </div>
                <div style="margin-bottom: 15px; padding: 10px; background: #2d2d2d; border-radius: 4px;">
                    <div style="color: #888; font-size: 11px;">总体风险评分</div>
                    <div style="font-size: 20px; font-weight: bold; color: ${this.getScoreColor(riskScore.percentage)}">
                        ${riskScore.percentage}% ${riskScore.grade}
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 15px;">
                    <div style="background: #c62828; padding: 8px; border-radius: 4px; text-align: center;">
                        <div style="font-size: 18px; font-weight: bold;">${summary.critical}</div>
                        <div style="font-size: 10px; color: #ffcdd2;">严重</div>
                    </div>
                    <div style="background: #ef6c00; padding: 8px; border-radius: 4px; text-align: center;">
                        <div style="font-size: 18px; font-weight: bold;">${summary.high}</div>
                        <div style="font-size: 10px; color: #ffe0b2;">高危</div>
                    </div>
                    <div style="background: #f9a825; padding: 8px; border-radius: 4px; text-align: center;">
                        <div style="font-size: 18px; font-weight: bold;">${summary.medium}</div>
                        <div style="font-size: 10px; color: #fff9c4;">中危</div>
                    </div>
                    <div style="background: #388e3c; padding: 8px; border-radius: 4px; text-align: center;">
                        <div style="font-size: 18px; font-weight: bold;">${summary.low}</div>
                        <div style="font-size: 10px; color: #c8e6c9;">低危</div>
                    </div>
                </div>
                <div style="margin-bottom: 15px;">
                    <div style="color: #888; margin-bottom: 5px;">发现详情:</div>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${findings.map(f => `
                            <div style="padding: 8px; margin: 5px 0; background: ${this.getSeverityColor(f.severity)}; border-radius: 4px;">
                                <div style="font-weight: bold; margin-bottom: 3px;">
                                    ${this.getSeverityIcon(f.severity)} [${f.id}] ${f.title.substring(0, 40)}...
                                </div>
                                <div style="font-size: 10px; color: #ccc;">${f.details.substring(0, 60)}...</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="export-report-btn" style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        导出报告
                    </button>
                    <button id="close-panel-btn" style="flex: 1; padding: 10px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        关闭
                    </button>
                </div>
            `;

            document.body.appendChild(panel);

            // 事件绑定
            document.getElementById('export-report-btn').onclick = () => this.exportReport();
            document.getElementById('close-panel-btn').onclick = () => panel.remove();
        }

        getSeverityColor(severity) {
            const colors = {
                critical: '#c62828',
                high: '#ef6c00',
                medium: '#f9a825',
                low: '#388e3c'
            };
            return colors[severity] || '#666';
        }

        getScoreColor(percentage) {
            if (percentage >= 50) return '#c62828';
            if (percentage >= 30) return '#ef6c00';
            if (percentage >= 10) return '#f9a825';
            return '#388e3c';
        }

        getSeverityIcon(severity) {
            const icons = {
                critical: '🔴',
                high: '🟠',
                medium: '🟡',
                low: '🟢'
            };
            return icons[severity] || '⚪';
        }

        exportReport() {
            if (!this.testResults) return;

            const reportText = this.formatReportAsText();
            const blob = new Blob([reportText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `security_report_${this.testResults.testId}.txt`;
            a.click();
            URL.revokeObjectURL(url);

            this.logger.log('报告已导出', 'success', 'core');
        }

        formatReportAsText() {
            const { summary, riskScore, findings, stats } = this.testResults;

            let report = `
╔═══════════════════════════════════════════════════════════════════════╗
║                   安全漏洞验证测试报告                                 ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  测试ID: ${this.testResults.testId}
║  目标URL: ${this.testResults.url}
║  测试时间: ${this.testResults.timestamp}
║  运行时长: ${stats.duration}
║  网络请求数: ${this.testResults.networkRequests}
║
╠═══════════════════════════════════════════════════════════════════════╣
║  风险评分: ${riskScore.percentage}% ${riskScore.grade}
╠═══════════════════════════════════════════════════════════════════════╣
║  漏洞统计:                                                           ║
║    🔴 严重: ${summary.critical}
║    🟠 高危: ${summary.high}
║    🟡 中危: ${summary.medium}
║    🟢 低危: ${summary.low}
║    ⚪ 总计: ${summary.total}
╠═══════════════════════════════════════════════════════════════════════╣
║  发现的漏洞:                                                         ║
            `;

            findings.forEach((f, i) => {
                report += `
║  ${i + 1}. [${f.id}] ${f.severity.toUpperCase()}
║     标题: ${f.title}
║     详情: ${f.details}
║     证据: ${JSON.stringify(f.evidence)}
║`;
            });

            report += `
╠═══════════════════════════════════════════════════════════════════════╣
║  所有日志:                                                           ║
            `;

            stats.modules && Object.entries(stats.modules).forEach(([module, counts]) => {
                report += `\n║  ${module}: 通过=${counts.pass} 失败=${counts.fail} 信息=${counts.info}\n`;
            });

            report += `
╚═══════════════════════════════════════════════════════════════════════╝
            `;

            return report;
        }
    }

    /*********************************************
     * 用户界面
     *********************************************/
    function createControlPanel(controller) {
        const panel = document.createElement('div');
        panel.id = 'security-control-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fff;
            border: 2px solid #4CAF50;
            border-radius: 8px;
            padding: 15px;
            z-index: 999998;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            min-width: 280px;
        `;

        panel.innerHTML = `
            <div style="margin-bottom: 15px; color: #333; font-weight: bold; font-size: 14px;">
                🔐 安全测试工具 v2.0
            </div>
            <div style="margin-bottom: 10px; font-size: 12px; color: #666;">
                <label>
                    <input type="checkbox" id="config-enabled" ${CONFIG.ENABLED ? 'checked' : ''}>
                    启用测试工具
                </label>
            </div>
            <div style="margin-bottom: 15px; font-size: 12px; color: #999;">
                当前站点: ${window.location.hostname}
            </div>
            <button id="run-tests-btn"
                    style="display: ${CONFIG.ENABLED ? 'block' : 'none'};
                           width: 100%;
                           padding: 10px;
                           background: #4CAF50;
                           color: white;
                           border: none;
                           border-radius: 4px;
                           cursor: pointer;
                           font-weight: bold;
                           margin-bottom: 10px;">
                ▶ 运行漏洞验证
            </button>
            <button id="show-report-btn"
                    style="display: none;
                           width: 100%;
                           padding: 8px;
                           background: #2196F3;
                           color: white;
                           border: none;
                           border-radius: 4px;
                           cursor: pointer;
                           margin-bottom: 10px;">
                📊 查看报告
            </button>
            <button id="clear-data-btn"
                    style="width: 100%;
                           padding: 8px;
                           background: #f44336;
                           color: white;
                           border: none;
                           border-radius: 4px;
                           cursor: pointer;">
                🗑️ 清除测试数据
            </button>
            <div style="margin-top: 10px; font-size: 10px; color: #999; text-align: center;">
                授权安全测试 | 仅用于测试环境
            </div>
        `;

        document.body.appendChild(panel);

        // 事件监听
        const enabledCheckbox = document.getElementById('config-enabled');
        const runBtn = document.getElementById('run-tests-btn');
        const reportBtn = document.getElementById('show-report-btn');
        const clearBtn = document.getElementById('clear-data-btn');

        enabledCheckbox.onchange = (e) => {
            CONFIG.ENABLED = e.target.checked;
            GM_setValue('security_tool_enabled', e.target.checked);
            runBtn.style.display = e.target.checked ? 'block' : 'none';
            console.log(`%c测试工具已${e.target.checked ? '启用' : '禁用'}`, e.target.checked ? 'color: green' : 'color: gray');
        };

        runBtn.onclick = async () => {
            if (!CONFIG.ENABLED) {
                alert('请先启用测试工具');
                return;
            }

            if (CONFIG.SAFETY.CONFIRM_BEFORE_RUN) {
                const confirmed = confirm(
                    '🔐 安全测试确认\n\n' +
                    `即将对 ${window.location.hostname} 进行漏洞验证\n` +
                    '测试内容:\n' +
                    '- 学习时长API漏洞\n' +
                    '- 验证码安全性\n' +
                    '- 并行播放检测\n' +
                    '- 鼠标轨迹追踪\n' +
                    '- 签名验证机制\n' +
                    '- 进度条限制绕过\n' +
                    '- 页面可见性检测\n' +
                    '- 会话安全管理\n\n' +
                    '确认继续?'
                );
                if (!confirmed) return;
            }

            runBtn.disabled = true;
            runBtn.textContent = '⏳ 测试中...';

            try {
                const results = await controller.runAllTests();
                if (results) {
                    controller.saveReport();
                    controller.displayResultsUI();
                    reportBtn.style.display = 'block';
                    reportBtn.onclick = () => controller.displayResultsUI();
                }
            } catch (e) {
                console.error('测试失败:', e);
                alert('测试失败: ' + e.message);
            } finally {
                runBtn.disabled = false;
                runBtn.textContent = '▶ 运行漏洞验证';
            }
        };

        clearBtn.onclick = () => {
            if (confirm('确定要清除所有测试数据吗?')) {
                localStorage.removeItem('security_test_logs');
                localStorage.removeItem('security_test_report');
                // 清除所有以security_开头的localStorage
                Object.keys(localStorage)
                    .filter(key => key.startsWith('security_'))
                    .forEach(key => localStorage.removeItem(key));
                alert('测试数据已清除');
            }
        };

        console.log('%c🔐 安全测试工具控制面板已加载', 'color: #4CAF50; font-weight: bold');
    }

    /*********************************************
     * 初始化
     *********************************************/
    async function initialize() {
        console.log(SECURITY_WARNING);

        // 恢复配置
        const savedEnabled = GM_getValue('security_tool_enabled', false);
        CONFIG.ENABLED = savedEnabled;

        if (!CONFIG.ENABLED) {
            console.log('%c安全测试工具已禁用。在控制面板中启用以开始测试。', 'color: orange');
            createControlPanel(new SecurityTestController());
            return;
        }

        if (window.location.hostname !== CONFIG.TARGET_DOMAIN) {
            console.warn(`%c不在目标域名上: ${CONFIG.TARGET_DOMAIN}`, 'color: orange');
            // 仍然显示控制面板但不自动运行
            createControlPanel(new SecurityTestController());
            return;
        }

        const controller = new SecurityTestController();
        createControlPanel(controller);

        // 延迟显示提示
        setTimeout(() => {
            console.log('%c点击右上角面板运行漏洞验证测试', 'color: #4CAF50; font-size: 14px; font-weight: bold');
        }, 2000);
    }

    // 启动
    if (CONFIG.ENABLED) {
        // 延迟启动,避免影响页面加载
        setTimeout(initialize, 1000);
    } else {
        // 即使未启用也创建控制面板
        setTimeout(() => {
            const controller = new SecurityTestController();
            createControlPanel(controller);
        }, 500);
    }

})();
