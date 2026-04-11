// ==UserScript==
// @name         🌟 简单大师 - 无痕刷课助手
// @namespace    security.simple.master
// @version      1.0.0
// @description  简单可靠，无复杂UI
// @match        https://scauzj.leykeji.com/*
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 配置管理器
    const Config = {
        storageKey: 'simple_master_config',
        defaults: {
            reportInterval: 2000,
            jumpSize: 30,
            targetPercent: 0.95,
            autoNext: true
        },
        load() {
            try {
                const saved = localStorage.getItem(this.storageKey);
                if (saved) return { ...this.defaults, ...JSON.parse(saved) };
            } catch (e) {}
            return { ...this.defaults };
        },
        save(cfg) {
            localStorage.setItem(this.storageKey, JSON.stringify(cfg));
        },
        get() {
            if (!this._cfg) this._cfg = this.load();
            return this._cfg;
        },
        set(k, v) {
            this._cfg = this._cfg || this.load();
            this._cfg[k] = v;
            this.save(this._cfg);
        }
    };

    // 简单UI
    function createUI(cfg) {
        // 防止重复
        if (document.getElementById('simple-master-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'simple-master-panel';
        panel.style.cssText = `
            position: fixed; top: 20px; right: 20px; width: 280px;
            background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 999999; font-family: sans-serif; font-size: 14px;
        `;

        panel.innerHTML = `
            <div style="background: linear-gradient(135deg,#667eea,#764ba2); color: white; padding: 16px; border-radius: 12px 12px 0 0;">
                <div style="font-weight: bold; font-size: 16px;">🌟 简单大师</div>
                <div style="font-size: 12px; opacity: 0.8;">无痕刷课助手</div>
            </div>
            <div style="padding: 16px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
                    <div>
                        <div style="font-size: 11px; color: #888;">节点</div>
                        <div id="sm-node" style="font-weight: bold;">--</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #888;">时长</div>
                        <div id="sm-duration">--</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #888;">进度</div>
                        <div id="sm-progress" style="color: #4CAF50;">0%</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #888;">状态</div>
                        <div id="sm-status" style="color: #2196F3;">待机</div>
                    </div>
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" id="sm-auto-next" ${cfg.autoNext ? 'checked' : ''} style="margin-right: 8px;">
                        <span style="font-size: 13px;">自动下一节</span>
                    </label>
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; font-size: 12px; color: #666; margin-bottom: 6px;">速度</label>
                    <select id="sm-mode" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="slow" ${cfg.reportInterval === 30000 ? 'selected' : ''}>慢速 (1x)</option>
                        <option value="normal" ${cfg.reportInterval === 2000 ? 'selected' : ''}>标准 (10x)</option>
                        <option value="fast" ${cfg.reportInterval === 1500 ? 'selected' : ''}>极速 (15x)</option>
                    </select>
                </div>
                <button id="sm-start" style="width: 100%; padding: 10px; background: linear-gradient(135deg,#667eea,#764ba2); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px;">
                    🚀 启动
                </button>
            </div>
        `;

        document.body.appendChild(panel);

        // 缓存元素
        const els = {
            panel,
            node: document.getElementById('sm-node'),
            duration: document.getElementById('sm-duration'),
            progress: document.getElementById('sm-progress'),
            status: document.getElementById('sm-status'),
            autoNext: document.getElementById('sm-auto-next'),
            mode: document.getElementById('sm-mode'),
            start: document.getElementById('sm-start')
        };

        // 绑定事件
        els.autoNext.onchange = (e) => cfg.autoNext = e.target.checked;
        els.mode.onchange = (e) => {
            const m = e.target.value;
            if (m === 'slow') { cfg.reportInterval = 30000; cfg.jumpSize = 30; }
            else if (m === 'normal') { cfg.reportInterval = 2000; cfg.jumpSize = 30; }
            else if (m === 'fast') { cfg.reportInterval = 1500; cfg.jumpSize = 30; }
            Config.set(cfg);
        };
        els.start.onclick = () => {
            if (window.SimpleMaster && window.SimpleMaster.start) {
                window.SimpleMaster.start();
            }
        };

        return els;
    }

    // 机器人
    class SimpleBot {
        constructor(env, cfg, ui) {
            this.env = env;
            this.cfg = cfg;
            this.ui = ui;
            this.running = false;
            this.studyId = null;
        }

        async start() {
            this.running = true;
            this.ui.status.textContent = '运行中';
            this.ui.status.style.color = '#4CAF50';

            console.log('🌟 简单大师启动', this.env);

            // 初始化会话
            const init = await this.api.study(1);
            if (!init.ok) {
                alert('初始化失败: ' + init.error);
                this.ui.status.textContent = '错误';
                this.ui.status.style.color = '#f44336';
                return false;
            }
            this.studyId = init.data.studyId;
            console.log('✅ 会话:', this.studyId);

            const jumpSize = this.cfg.jumpSize || 30;
            const interval = this.cfg.reportInterval || 2000;
            const target = Math.floor(this.env.duration * (this.cfg.targetPercent || 0.95));
            const loops = Math.ceil(target / jumpSize);

            for (let i = 0; i < loops && this.running; i++) {
                const time = (i + 1) * jumpSize;

                const res = await this.api.study(time);
                if (!res.ok && res.error && res.error.includes('学时')) {
                    i--;
                    await this.sleep(3000);
                    continue;
                }

                const pct = Math.floor(time / this.env.duration * 100);
                this.ui.progress.textContent = pct + '%';

                if (i < loops - 1 && this.running) {
                    await this.sleep(interval);
                }
            }

            await this.api.study(this.env.duration);

            if (this.cfg.autoNext) {
                await this.autoNext();
            }

            this.ui.progress.textContent = '100%';
            this.ui.status.textContent = '完成';
            this.ui.status.style.color = '#FF9800';

            console.log('✅ 完成！记录时长:', this.env.duration);
            return true;
        }

        async autoNext() {
            await this.sleep(2000);
            const selectors = ['.next-node', '.next-btn', '[data-next]', 'a.next', 'button.next'];
            for (const sel of selectors) {
                const btn = document.querySelector(sel);
                if (btn && btn.offsetParent !== null) {
                    btn.click();
                    console.log('➡️  下一节');
                    return;
                }
            }
        }

        stop() {
            this.running = false;
            this.ui.status.textContent = '已停止';
            this.ui.status.style.color = '#f44336';
        }

        sleep(ms) {
            return new Promise(r => setTimeout(r, ms));
        }

        get api() {
            if (!this._api) {
                this._api = {
                    nodeId: this.env.nodeId,
                    async study(time, studyId = null) {
                        const body = { nodeId: this._api.nodeId, studyTime: time };
                        if (studyId) body.studyId = studyId;
                        try {
                            const res = await fetch(`${location.origin}/user/node/study`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(body),
                                credentials: 'include'
                            });
                            const data = await res.json().catch(() => ({}));
                            return { ok: res.ok, data, error: data.message || res.status };
                        } catch (e) {
                            return { ok: false, error: e.message };
                        }
                    }
                };
            }
            return this._api;
        }
    }

    // 主控制器
    class SimpleController {
        constructor(cfg) {
            this.cfg = cfg;
            this.ui = null;
            this.bot = null;
        }

        async start() {
            const env = this.detect();
            if (!env) {
                alert('请先访问学习节点页面');
                return false;
            }

            this.ui = createUI(this.cfg);
            this.ui.node.textContent = env.nodeId;
            this.ui.duration.textContent = env.duration + 's';
            this.ui.status.textContent = '待机';

            this.bot = new SimpleBot(env, this.cfg, this.ui);
            await this.bot.start();
            return true;
        }

        stop() {
            if (this.bot) {
                this.bot.stop();
                this.bot = null;
            }
        }

        detect() {
            const match = location.pathname.match(/\/node\/(\d+)/);
            if (!match) return null;

            let duration = 0;
            const video = document.querySelector('video');
            if (video && video.duration && video.duration !== Infinity) {
                duration = Math.floor(video.duration);
            } else {
                const m = document.body.textContent.match(/(\d{1,2}):(\d{2})/);
                if (m) duration = parseInt(m[1]) * 60 + parseInt(m[2]);
            }

            if (!duration || duration <= 0) duration = 3600;

            return { nodeId: match[1], duration };
        }
    }

    // 初始化
    async function init() {
        await new Promise(r => setTimeout(r, 1500));

        const cfg = Config.load();
        const controller = new SimpleController(cfg);

        window.SimpleMaster = controller;

        const env = controller.detect();
        if (env) {
            console.log('🌟 简单大师就绪，节点:', env.nodeId, '时长:', env.duration + 's');
        } else {
            console.log('⚠️  请先访问学习节点页面');
        }
    }

    init();

})();
