// ==UserScript==
// @name         🔴 REDTEAM - 自动化刷课攻击链
// @namespace    security.redteam
// @version      4.0.0
// @description  专业红队攻击脚本 | 漏洞利用完整演示 | 无保护机制
// @author       红队专家组
// @match        https://scauzj.leykeji.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @run-at       document-end
// @license      MIT
// ==/UserScript==

/**
 * 专业红队工具 - 无废话版本
 *
 * 设计原则：
 * 1. 无多余警告（你是专家，知道自己在做什么）
 * 2. 直接攻击核心漏洞
 * 3. 最小化检测风险
 * 4. 可组合攻击链
 *
 * 攻击链：
 * [登录] → [环境伪装] → [课程发现] → [并行攻击] → [验证码AI解] → [完成]
 */

(function() {
    'use strict';

    // ==================== 核心配置 ====================
    const CONFIG = {
        // 攻击速度（毫秒）
        interval: 2000,           // 上报间隔（正常30秒，这里2秒）
        jumpSize: 30,             // 每次跳跃秒数

        // AI验证码（需智谱AI API Key）
        ai: {
            apiKey: '',           // https://open.bigmodel.cn 申请
            model: 'glm-4v-flash'
        },

        // 并发设置
        parallel: {
            enabled: true,        // 并行攻击
            max: 5                // 最大并发数
        },

        // 日志
        verbose: true
    };

    // ==================== 工具 ====================
    const $ = {
        log: (msg, type = 'info') => {
            if (!CONFIG.verbose && type === 'debug') return;
            const icons = {error: '❌', warn: '⚠️', success: '✅', info: 'ℹ️', debug: '🐛'};
            const colors = {error: '#f44336', warn: '#ff9800', success: '#4CAF50', info: '#2196F3', debug: '#9e9e9e'};
            console.log(`%c${icons[type] || '•'} ${msg}`, `color: ${colors[type] || '#000'}`);
        },
        sleep: ms => new Promise(r => setTimeout(r, ms)),
        random: (min, max) => Math.random() * (max - min) + min
    };

    // ==================== 状态管理 ====================
    const state = {
        bots: new Map(),          // nodeId -> Bot实例
        stats: {
            start: Date.now(),
            apiCalls: 0,
            completed: 0,
            captchas: 0
        }
    };

    // ==================== API客户端 ====================
    class APIClient {
        constructor() {
            this.base = location.origin;
            this.cookie = document.cookie;
        }

        async post(path, data) {
            state.stats.apiCalls++;

            const opts = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': this.cookie,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(data),
                credentials: 'include'
            };

            try {
                const res = await fetch(`${this.base}${path}`, opts);
                const txt = await res.text();
                const json = txt ? JSON.parse(txt) : {};

                if (res.ok) {
                    $.log(`[${res.status}] ${path}`, 'debug');
                    return {ok: true, data: json};
                } else {
                    $.log(`[${res.status}] ${path} - ${json.message || json.code}`, 'warn');
                    return {ok: false, error: json.message || json.code, data: json};
                }
            } catch (e) {
                $.log(`请求失败 ${path}: ${e.message}`, 'error');
                return {ok: false, error: e.message};
            }
        }
    }

    // ==================== AI验证码求解 ====================
    class AISolver {
        constructor(apiKey) {
            this.key = apiKey;
            this.url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
        }

        async solve(imgEl) {
            if (!this.key) return null;

            try {
                const blob = await fetch(imgEl.src).then(r => r.blob());
                const base64 = await new Promise(r => {
                    const rd = new FileReader();
                    rd.onload = () => r(rd.result);
                    rd.readAsDataURL(blob);
                });

                const resp = await fetch(this.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.key}`
                    },
                    body: JSON.stringify({
                        model: 'glm-4v-flash',
                        messages: [{
                            role: 'user',
                            content: [
                                {type: 'text', text: '识别验证码，只返回字符：'},
                                {type: 'image_url', image_url: {url: base64}}
                            ]
                        }],
                        max_tokens: 10
                    })
                });

                const json = await resp.json();
                const text = json.choices?.[0]?.message?.content?.trim();
                const code = text?.match(/[a-zA-Z0-9]{4,6}/)?.[0];

                if (code) {
                    $.log(`AI识别: ${code}`, 'success');
                    state.stats.captchas++;
                    return code;
                }
            } catch (e) {
                $.log(`AI识别失败: ${e.message}`, 'debug');
            }
            return null;
        }
    }

    // ==================== 攻击机器人 ====================
    class Bot {
        constructor(api, nodeId, name) {
            this.api = api;
            this.nodeId = nodeId;
            this.name = name;
            this.running = false;
            this.studyId = null;
            this.current = 0;
            this.target = 0;
        }

        async start(totalDuration) {
            this.running = true;
            this.target = Math.floor(totalDuration * 0.95); // 完成95%

            $.log(`[${this.name}] 启动 → node:${this.nodeId} 目标:${this.target}s`, 'info');

            // 1. 初始化会话
            const init = await this.api.post('/user/node/study', {
                nodeId: this.nodeId,
                studyTime: 1
            });

            if (!init.ok) {
                $.log(`[${this.name}] 初始化失败: ${init.error}`, 'error');
                return;
            }

            this.studyId = init.data.studyId;
            this.current = 1;
            $.log(`[${this.name}] studyId: ${this.studyId}`, 'debug');

            // 2. 攻击循环
            while (this.running && this.current < this.target) {
                // 检查验证码
                await this.checkCaptcha();

                // 上报
                const result = await this.api.post('/user/node/study', {
                    nodeId: this.nodeId,
                    studyTime: this.current,
                    studyId: this.studyId
                });

                if (result.ok) {
                    const pct = Math.floor(this.current / this.target * 100);
                    if (pct % 25 === 0) {
                        $.log(`[${this.name}] ${pct}% (${this.current}s)`, 'info');
                    }
                } else {
                    // VULN-009: 时间跳跃失败处理
                    if (result.error?.includes('提交学时')) {
                        this.current -= CONFIG.jumpSize * 2;
                        $.log(`[${this.name}] 时间回退至 ${this.current}s`, 'warn');
                    }
                }

                this.current += CONFIG.jumpSize;
                await $.sleep(CONFIG.interval + $.random(-200, 200));
            }

            // 3. 最终上报
            await this.api.post('/user/node/study', {
                nodeId: this.nodeId,
                studyTime: this.target,
                studyId: this.studyId
            });

            state.stats.completed++;
            this.running = false;
            $.log(`[${this.name}] ✅ 完成! 总时长: ${this.current}s`, 'success');
        }

        stop() {
            this.running = false;
            $.log(`[${this.name}] 停止`, 'info');
        }

        async checkCaptcha() {
            const captchaModal = document.querySelector('.captcha-modal, [need_code], .verify-code');
            if (!captchaModal) return;

            const img = captchaModal.querySelector('img[src*="code"]');
            if (img) {
                const solver = new AISolver(CONFIG.ai.apiKey);
                const code = await solver.solve(img);
                if (code) {
                    // 自动提交
                    await this.api.post('/user/node/verifyCode', {
                        nodeId: this.nodeId,
                        code: code
                    });
                    captchaModal.remove();
                }
            }
        }
    }

    // ==================== 反检测 ====================
    const Countermeasures = {
        install() {
            // 1. VULN-008: 伪造页面可见性
            Object.defineProperty(document, 'visibilityState', {
                get: () => 'visible',
                configurable: true
            });
            Object.defineProperty(document, 'hidden', {
                get: () => false,
                configurable: true
            });

            // 2. VULN-003: 伪造并行检测
            const schoolId = this.getFromCookie('schoolId') || 'test';
            const userId = this.getFromCookie('userId') || 'test';
            const fakeNode = this.getNodeId() || 'fake';

            setInterval(() => {
                try {
                    localStorage.setItem(`node_play_${schoolId}${userId}`, fakeNode);
                } catch (e) {}
            }, 500);

            // 3. 阻止失焦事件
            window.onblur = window.onfocus = () => true;

            $.log('反检测已部署', 'debug');
        },

        getFromCookie(name) {
            const m = document.cookie.match(new RegExp(`${name}=([^;]+)`));
            return m ? m[1] : null;
        },

        getNodeId() {
            const m = location.pathname.match(/\/node\/(\d+)/);
            return m ? m[1] : null;
        }
    };

    // ==================== 发现目标 ====================
    function discoverTargets() {
        const targets = [];

        // 当前页面的nodeId
        const current = location.pathname.match(/\/node\/(\d+)/);
        if (current) {
            targets.push({
                id: current[1],
                name: '当前课程',
                duration: getVideoDuration() || 3600
            });
        }

        // 课程列表中的节点
        document.querySelectorAll('a[href*="/node/"]').forEach(a => {
            const m = a.href.match(/\/node\/(\d+)/);
            if (m && !targets.find(t => t.id === m[1])) {
                targets.push({
                    id: m[1],
                    name: a.textContent.trim().substring(0, 20),
                    duration: 3600
                });
            }
        });

        return targets;
    }

    function getVideoDuration() {
        const video = document.querySelector('video');
        if (video?.duration && video.duration !== Infinity) {
            return Math.floor(video.duration);
        }

        // 从页面文本提取
        const txt = document.body.textContent;
        const m = txt.match(/(\d{1,2}):(\d{2})/);
        if (m) {
            return parseInt(m[1]) * 60 + parseInt(m[2]);
        }
        return null;
    }

    // ==================== 主控制器 ====================
    const AttackEngine = {
        api: null,
        running: false,

        init() {
            this.api = new APIClient();
            Countermeasures.install();

            $.log(`[攻击引擎] 就绪 - ${discoverTargets().length} 个目标`, 'info');
        },

        async launch() {
            if (this.running) return;
            this.running = true;

            state.stats.start = Date.now();
            const targets = discoverTargets();

            if (targets.length === 0) {
                $.log('未发现攻击目标', 'error');
                this.running = false;
                return;
            }

            $.log(`目标: ${targets.length} 个课程`, 'info');

            // 并行攻击
            const pLimit = CONFIG.parallel.enabled ? CONFIG.parallel.max : 1;
            const sem = new Semaphore(pLimit);

            const tasks = targets.map(async t => {
                await sem.acquire();
                try {
                    const bot = new Bot(this.api, t.id, t.name);
                    state.bots.set(t.id, bot);
                    await bot.start(t.duration);
                } finally {
                    sem.release();
                }
            });

            await Promise.all(tasks);

            this.running = false;
            this.report();
        },

        stop() {
            state.bots.forEach(bot => bot.stop());
            state.bots.clear();
            this.running = false;
            $.log('攻击已停止', 'info');
        },

        report() {
            const duration = (Date.now() - state.stats.start) / 1000;
            console.table({
                '总用时': `${duration.toFixed(1)}秒`,
                'API调用': state.stats.apiCalls,
                '完成节点': state.stats.completed,
                '验证码': state.stats.captchas
            });

            if (typeof GM_notification !== 'undefined') {
                GM_notification({
                    title: '攻击完成',
                    text: `完成 ${state.stats.completed} 节点 | ${state.stats.apiCalls} API调用`,
                    timeout: 5000
                });
            }
        }
    };

    // 信号量
    class Semaphore {
        constructor(n) { this.n = n; this.q = []; this.c = n; }
        async acquire() {
            if (this.c > 0) { this.c--; return; }
            await new Promise(r => this.q.push(r));
            this.c--;
        }
        release() {
            this.c++;
            if (this.q.length) this.q.shift()();
        }
    }

    // ==================== UI ====================
    function createUI() {
        const ui = document.createElement('div');
        ui.id = 'redteam-attack-ui';
        ui.style.cssText = `
            position: fixed; top: 10px; right: 10px; width: 280px;
            background: #000; color: #0f0; font-family: 'Courier New', monospace;
            font-size: 12px; padding: 12px; border: 1px solid #0f0;
            border-radius: 4px; z-index: 999999; box-shadow: 0 0 10px rgba(0,255,0,0.3);
        `;

        const {stats} = state;

        ui.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; color: #0f0;">
                ⚡ REDTEAM ATTACK ENGINE
            </div>
            <div style="margin-bottom: 10px; font-size: 11px; opacity: 0.7;">
                ${location.hostname}
            </div>
            <div style="background: #111; padding: 8px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between;">
                    <span>状态</span><span id="rt-status">待机</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>完成</span><span id="rt-completed">${stats.completed}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>API调用</span><span id="rt-calls">${stats.apiCalls}</span>
                </div>
            </div>
            <button id="rt-launch" style="width: 100%; padding: 8px; background: #0f0; color: #000; border: none; font-weight: bold; cursor: pointer; margin-bottom: 5px;">
                [ 启动攻击 ]
            </button>
            <button id="rt-stop" style="width: 100%; padding: 6px; background: #222; color: #f00; border: 1px solid #f00; cursor: pointer; display: none;">
                [ 停止 ]
            </button>
            <div style="margin-top: 10px; font-size: 10px; opacity: 0.5; text-align: center;">
                授权测试专用
            </div>
        `;

        document.body.appendChild(ui);

        const launch = document.getElementById('rt-launch');
        const stop = document.getElementById('rt-stop');
        const status = document.getElementById('rt-status');

        launch.onclick = async () => {
            if (confirm('开始攻击？此操作将真实修改学习进度。')) {
                launch.disabled = true;
                stop.style.display = 'block';
                status.textContent = '运行中';
                status.style.color = '#ff0';
                AttackEngine.launch().finally(() => {
                    launch.disabled = false;
                    stop.style.display = 'none';
                    status.textContent = '待机';
                    status.style.color = '#0f0';
                });
            }
        };

        stop.onclick = () => {
            AttackEngine.stop();
            launch.disabled = false;
            stop.style.display = 'none';
            status.textContent = '已停止';
        };

        // 实时更新
        setInterval(() => {
            document.getElementById('rt-completed').textContent = stats.completed;
            document.getElementById('rt-calls').textContent = stats.apiCalls;
        }, 500);
    }

    // ==================== 启动 ====================
    AttackEngine.init();
    createUI();

    $.log('REDTEAM攻击引擎已加载', 'success');
    $.log('发现目标:', 'info', discoverTargets());

    // 暴露到全局供控制台使用
    window.REDTEAM = {
        start: () => AttackEngine.launch(),
        stop: () => AttackEngine.stop(),
        bots: state.bots,
        stats: state.stats
    };

    $.log('控制台可用: REDTEAM.start() / REDTEAM.stop()', 'info');

})();
