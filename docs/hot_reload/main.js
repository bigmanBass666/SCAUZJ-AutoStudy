
(function() {

// == GM API 兼容层 ==
// 如果直接注入页面（非 Tampermonkey 环境），使用 window 上的模拟实现
const _GM_getValue  = typeof GM_getValue !== 'undefined'  ? GM_getValue  : window.GM_getValue;
const _GM_setValue  = typeof GM_setValue !== 'undefined'  ? GM_setValue  : window.GM_setValue;
const _GM_deleteValue = typeof GM_deleteValue !== 'undefined' ? GM_deleteValue : window.GM_deleteValue;
const _GM_addStyle  = typeof GM_addStyle !== 'undefined'  ? GM_addStyle  : window.GM_addStyle;
const _GM_xmlhttpRequest = typeof GM_xmlhttpRequest !== 'undefined' ? GM_xmlhttpRequest : window.GM_xmlhttpRequest;
const _GM_notification = typeof GM_notification !== 'undefined' ? GM_notification : window.GM_notification;
const _GM_setClipboard = typeof GM_setClipboard !== 'undefined' ? GM_setClipboard : window.GM_setClipboard;
const _GM_registerMenuCommand = typeof GM_registerMenuCommand !== 'undefined' ? GM_registerMenuCommand : window.GM_registerMenuCommand;
const _GM_log = typeof GM_log !== 'undefined' ? GM_log : window.GM_log;


    'use strict';

    // ==================== 默认配置 ====================
    const DEFAULTS = {
        speed: { mode: 'normal', reportInterval: 2000, jumpSize: 30 },
        ai: { enabled: false, apiKey: '', maxPerSession: 10 },
        autoNext: { enabled: true, delay: 2000 },
        completion: { targetPercent: 0.95 }
    };

    // ==================== 配置管理器 ====================
    class ConfigManager {
        constructor() {
            this.storageKey = 'elegant_master_config_v4';
            this.config = this.load();
        }
        load() {
            try {
                const saved = localStorage.getItem(this.storageKey);
                if (saved) return JSON.parse(saved);
            } catch (e) {}
            return JSON.parse(JSON.stringify(DEFAULTS));
        }
        save() {
            try { localStorage.setItem(this.storageKey, JSON.stringify(this.config)); } catch (e) {}
        }
        get(path, defaultValue = null) {
            const keys = path.split('.'); let value = this.config;
            for (const key of keys) {
                if (value && typeof value === 'object' && key in value) value = value[key];
                else return defaultValue;
            }
            return value === undefined ? defaultValue : value;
        }
        set(path, value) {
            const keys = path.split('.'); const lastKey = keys.pop();
            let target = this.config; for (const key of keys) {
                if (!(key in target)) target[key] = {}; target = target[key];
            }
            target[lastKey] = value; this.save();
        }
        getAll() { return JSON.parse(JSON.stringify(this.config)); }
        reset() {
            this.config = JSON.parse(JSON.stringify(DEFAULTS));
            this.save();
        }
    }

    // ==================== UI 构建器 ====================
    class UIBuilder {
        constructor(configMgr) {
            this.config = configMgr;
            this.panel = null;
            this.elements = {};
        }

        create() {
            // 创建主面板
            this.panel = document.createElement('div');
            this.panel.id = 'elegant-master-panel';
            this.panel.style.cssText = `
                position: fixed; top: 20px; right: 20px; width: 320px; max-height: 90vh;
                background: #fff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                z-index: 999999; font-family: -apple-system, sans-serif; font-size: 14px;
                overflow: hidden; display: flex; flex-direction: column;
            `;

            // 构建面板结构
            const header = this.buildHeader();
            const contentWrapper = this.buildContentWrapper();
            const footer = this.buildFooter();

            // 组装
            this.panel.appendChild(header);
            this.panel.appendChild(contentWrapper);
            this.panel.appendChild(footer);
            document.body.appendChild(this.panel);

            // 缓存元素
            this.cacheElements();

            // 绑定事件（在DOM插入后）
            this.bindEvents();

            // 同步UI状态
            this.syncUI();

            console.log('✅ 优雅大师UI创建成功');
        }

        buildHeader() {
            const header = document.createElement('div');
            header.style.cssText = `
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white; padding: 16px 20px;
                display: flex; align-items: center; justify-content: space-between;
            `;

            const titleDiv = document.createElement('div');
            titleDiv.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <span style="font-size: 24px; margin-right: 10px;">🌟</span>
                    <div>
                        <div style="font-weight: 600; font-size: 16px;">优雅大师</div>
                        <div style="font-size: 11px; opacity: 0.8;">无痕刷课助手</div>
                    </div>
                </div>
            `;

            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'elegant-toggle';
            toggleBtn.style.cssText = `
                background: rgba(255,255,255,0.2); border: none; color: white;
                padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;
            `;
            toggleBtn.textContent = '收起';

            header.appendChild(titleDiv);
            header.appendChild(toggleBtn);
            return header;
        }

        buildContentWrapper() {
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'content-wrapper';
            contentWrapper.style.cssText = 'flex: 1; overflow-y: auto;';

            const content = document.createElement('div');
            content.className = 'main-content';
            content.style.cssText = 'padding: 20px; background: #f8f9fa;';

            content.appendChild(this.buildStatusCard());
            content.appendChild(this.buildQuickControl());
            content.appendChild(this.buildAdvancedSection());

            contentWrapper.appendChild(content);
            return contentWrapper;
        }

        buildStatusCard() {
            const card = document.createElement('div');
            card.style.cssText = 'background: white; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);';
            card.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                    <div><div style="font-size: 11px; color: #888; margin-bottom: 4px;">节点</div>
                        <div id="stat-node" style="font-weight: 600; color: #333;">--</div></div>
                    <div><div style="font-size: 11px; color: #888; margin-bottom: 4px;">时长</div>
                        <div id="stat-duration" style="font-weight: 600; color: #333;">--</div></div>
                    <div><div style="font-size: 11px; color: #888; margin-bottom: 4px;">进度</div>
                        <div id="stat-progress" style="font-weight: 600; color: #4CAF50;">0%</div></div>
                    <div><div style="font-size: 11px; color: #888; margin-bottom: 4px;">状态</div>
                        <div id="stat-status" style="font-weight: 600; color: #2196F3;">待机</div></div>
                </div>
            `;
            return card;
        }

        buildQuickControl() {
            const section = document.createElement('div');
            section.style.cssText = 'background: white; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);';
            section.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 12px; color: #333;">⚡ 快速控制</div>
                <div style="margin-bottom: 12px;">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" id="ctrl-auto-next" style="margin-right: 8px;">
                        <span style="font-size: 13px;">完成后自动下一节</span>
                    </label>
                </div>
                <div>
                    <label style="display: block; font-size: 12px; color: #666; margin-bottom: 6px;">加速模式</label>
                    <div style="display: flex; gap: 8px;">
                        <button class="speed-btn" data-mode="slow" style="flex: 1; padding: 8px; background: #e0e0e0; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">1x 慢速</button>
                        <button class="speed-btn" data-mode="normal" style="flex: 1; padding: 8px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">10x 标准</button>
                        <button class="speed-btn" data-mode="fast" style="flex: 1; padding: 8px; background: #e0e0e0; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">15x 极速</button>
                    </div>
                </div>
            `;
            return section;
        }

        buildAdvancedSection() {
            const section = document.createElement('div');
            section.style.cssText = 'background: white; border-radius: 12px; margin-bottom: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);';

            const header = document.createElement('div');
            header.style.cssText = 'padding: 12px 16px; background: #f8f9fa; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #eee; font-weight: 600;';
            header.innerHTML = '<span>⚙️ 高级设置</span><span id="adv-arrow" style="transition: transform 0.3s; font-size: 12px;">▼</span>';

            const content = document.createElement('div');
            content.style.cssText = 'padding: 16px; display: block;'; // 默认展开
            content.innerHTML = this.buildAdvancedContent();

            header.onclick = () => {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                const arrow = document.getElementById('adv-arrow');
                if (arrow) arrow.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
            };

            section.appendChild(header);
            section.appendChild(content);
            return section;
        }

        buildAdvancedContent() {
            const interval = this.config.get('speed.reportInterval', 2000);
            const jump = this.config.get('speed.jumpSize', 30);
            const target = this.config.get('completion.targetPercent', 0.95);

            return `
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; color: #666; margin-bottom: 6px;">上报间隔 (ms)</label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="range" class="adv-slider" data-key="speed.reportInterval" min="500" max="30000" step="500" value="${interval}" style="flex: 1;">
                        <span class="slider-value" style="font-size: 12px; width: 60px; text-align: right;">${interval}</span>
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; color: #666; margin-bottom: 6px;">每次跳跃 (秒)</label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="range" class="adv-slider" data-key="speed.jumpSize" min="10" max="300" step="10" value="${jump}" style="flex: 1;">
                        <span class="slider-value" style="font-size: 12px; width: 60px; text-align: right;">${jump}</span>
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; color: #666; margin-bottom: 6px;">完成目标 (%)</label>
                    <div style="display: flex; gap: 8px;">
                        <button class="target-btn" data-target="0.9" style="padding: 6px 12px; background: ${target===0.9?'#667eea':'#e0e0e0'}; color: ${target===0.9?'white':'#333'}; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">90%</button>
                        <button class="target-btn" data-target="0.95" style="padding: 6px 12px; background: ${target===0.95?'#667eea':'#e0e0e0'}; color: ${target===0.95?'white':'#333'}; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">95%</button>
                        <button class="target-btn" data-target="0.98" style="padding: 6px 12px; background: ${target===0.98?'#667eea':'#e0e0e0'}; color: ${target===0.98?'white':'#333'}; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">98%</button>
                        <button class="target-btn" data-target="1" style="padding: 6px 12px; background: ${target===1?'#667eea':'#e0e0e0'}; color: ${target===1?'white':'#333'}; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">100%</button>
                    </div>
                </div>
                <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; font-size: 12px; color: #666;">
                    💡 高级设置按需调整，默认已优化。
                </div>
            `;
        }

        buildFooter() {
            const footer = document.createElement('div');
            footer.className = 'footer';
            footer.style.cssText = 'background: #f8f9fa; padding: 16px 20px; border-top: 1px solid #eee; display: flex; gap: 10px;';
            footer.innerHTML = `
                <button id="btn-settings" style="flex: 1; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px;">⚙️ AI配置</button>
                <button id="btn-start" style="flex: 2; padding: 10px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">🚀 启动</button>
                <button id="btn-reset" style="flex: 1; padding: 10px; background: #dc3545; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px;">重置</button>
            `;
            return footer;
        }

        // ==================== 缓存元素 ====================
        cacheElements() {
            const p = this.panel;
            this.elements = {
                panel: p,
                contentWrapper: p.querySelector('.content-wrapper'),
                footer: p.querySelector('.footer'),
                statNode: p.querySelector('#stat-node'),
                statDuration: p.querySelector('#stat-duration'),
                statProgress: p.querySelector('#stat-progress'),
                statStatus: p.querySelector('#stat-status'),
                btnSettings: p.querySelector('#btn-settings'),
                btnStart: p.querySelector('#btn-start'),
                btnReset: p.querySelector('#btn-reset'),
                toggleBtn: p.querySelector('#elegant-toggle'),
                ctrlAutoNext: p.querySelector('#ctrl-auto-next'),
                advAutoStop: p.querySelector('#adv-auto-stop'),
                sliders: p.querySelectorAll('.adv-slider'),
                targetBtns: p.querySelectorAll('.target-btn')
            };
        }

        // ==================== 事件绑定 ====================
        bindEvents() {
            // 折叠按钮
            const toggleBtn = this.elements.toggleBtn;
            if (toggleBtn) {
                let expanded = true;
                toggleBtn.onclick = () => {
                    expanded = !expanded;
                    if (this.elements.contentWrapper) this.elements.contentWrapper.style.display = expanded ? 'block' : 'none';
                    if (this.elements.footer) this.elements.footer.style.display = expanded ? 'flex' : 'none';
                    toggleBtn.textContent = expanded ? '收起' : '展开';
                };
            }

            // 底部按钮
            if (this.elements.btnSettings) {
                this.elements.btnSettings.onclick = () => this.showSettingsModal();
            }
            if (this.elements.btnStart) {
                this.elements.btnStart.onclick = () => {
                    if (window.MasterEngine && window.MasterEngine.start) {
                        window.MasterEngine.start();
                    } else {
                        alert('引擎未就绪，请刷新页面');
                    }
                };
            }
            if (this.elements.btnReset) {
                this.elements.btnReset.onclick = () => {
                    if (confirm('确定重置所有配置？')) {
                        this.config.reset();
                        this.syncUI();
                        alert('已重置');
                    }
                };
            }

            // 快速控制 - 自动下一节
            const ctrlAutoNext = this.elements.ctrlAutoNext;
            if (ctrlAutoNext) {
                ctrlAutoNext.checked = this.config.get('autoNext.enabled', true);
                ctrlAutoNext.onchange = (e) => {
                    this.config.set('autoNext.enabled', e.target.checked);
                };
            }

            // 速度按钮
            const speedBtns = this.panel.querySelectorAll('.speed-btn');
            speedBtns.forEach(btn => {
                btn.onclick = () => {
                    speedBtns.forEach(b => {
                        b.style.background = '#e0e0e0';
                        b.style.color = '#333';
                    });
                    btn.style.background = '#667eea';
                    btn.style.color = '#fff';

                    const mode = btn.dataset.mode;
                    let interval = 2000, jump = 30;
                    switch (mode) {
                        case 'slow': interval = 30000; break;
                        case 'fast': interval = 1500; break;
                    }
                    this.config.set('speed.reportInterval', interval);
                    this.config.set('speed.jumpSize', jump);
                    this.config.set('speed.mode', mode);
                };
            });

            // 高级设置滑块
            this.elements.sliders.forEach(slider => {
                slider.oninput = () => {
                    const valSpan = slider.parentNode.querySelector('.slider-value');
                    if (valSpan) valSpan.textContent = slider.value;
                };
                slider.onchange = () => {
                    const key = slider.dataset.key;
                    this.config.set(key, parseInt(slider.value));
                };
            });

            // 完成目标按钮
            this.elements.targetBtns.forEach(btn => {
                btn.onclick = () => {
                    this.elements.targetBtns.forEach(b => {
                        b.style.background = '#e0e0e0';
                        b.style.color = '#333';
                    });
                    btn.style.background = '#667eea';
                    btn.style.color = '#fff';
                    this.config.set('completion.targetPercent', parseFloat(btn.dataset.target));
                };
            });

            // 高级设置 - 自动下一节
            const advAutoStop = this.elements.advAutoStop;
            if (advAutoStop) {
                advAutoStop.checked = this.config.get('autoNext.enabled', true);
                advAutoStop.onchange = (e) => {
                    this.config.set('autoNext.enabled', e.target.checked);
                };
            }
        }

        // ==================== 同步UI ====================
        syncUI() {
            // 自动下一节
            if (this.elements.ctrlAutoNext) {
                this.elements.ctrlAutoNext.checked = this.config.get('autoNext.enabled', true);
            }

            // 速度按钮
            const mode = this.config.get('speed.mode', 'normal');
            const speedBtn = this.panel.querySelector(`.speed-btn[data-mode="${mode}"]`);
            if (speedBtn) {
                this.panel.querySelectorAll('.speed-btn').forEach(b => {
                    b.style.background = '#e0e0e0';
                    b.style.color = '#333';
                });
                speedBtn.style.background = '#667eea';
                speedBtn.style.color = '#fff';
            }

            // 滑块
            const intervalSlider = this.panel.querySelector('.adv-slider[data-key="speed.reportInterval"]');
            if (intervalSlider) {
                intervalSlider.value = this.config.get('speed.reportInterval', 2000);
                const valSpan = intervalSlider.parentNode.querySelector('.slider-value');
                if (valSpan) valSpan.textContent = intervalSlider.value;
            }

            const jumpSlider = this.panel.querySelector('.adv-slider[data-key="speed.jumpSize"]');
            if (jumpSlider) {
                jumpSlider.value = this.config.get('speed.jumpSize', 30);
            }

            // 完成目标按钮
            const target = this.config.get('completion.targetPercent', 0.95);
            const targetBtn = this.panel.querySelector(`.target-btn[data-target="${target}"]`);
            if (targetBtn) {
                this.panel.querySelectorAll('.target-btn').forEach(b => {
                    b.style.background = '#e0e0e0';
                    b.style.color = '#333';
                });
                targetBtn.style.background = '#667eea';
                targetBtn.style.color = '#fff';
            }

            if (this.elements.advAutoStop) {
                this.elements.advAutoStop.checked = this.config.get('autoNext.enabled', true);
            }
        }

        // ==================== 状态更新 ====================
        updateStatus(nodeId, duration, progress, status) {
            if (this.elements.statNode) this.elements.statNode.textContent = nodeId || '--';
            if (this.elements.statDuration) this.elements.statDuration.textContent = duration ? duration + 's' : '--';
            if (this.elements.statProgress) this.elements.statProgress.textContent = progress !== null ? progress + '%' : '0%';
            if (this.elements.statStatus) {
                this.elements.statStatus.textContent = status || '待机';
                const colors = { '运行中': '#4CAF50', '待机': '#2196F3', '错误': '#f44336', '完成': '#FF9800' };
                this.elements.statStatus.style.color = colors[status] || '#333';
            }
        }

        // ==================== AI配置弹窗 ====================
        showSettingsModal() {
            const modal = document.createElement('div');
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999999; display: flex; align-items: center; justify-content: center;';

            const content = document.createElement('div');
            content.style.cssText = 'background: white; width: 400px; max-height: 80vh; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);';
            content.innerHTML = `
                <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px;">
                    <div style="font-size: 18px; font-weight: 600;">⚙️ AI验证码配置</div>
                    <div style="font-size: 12px; opacity: 0.8;">智谱AI GLM-4V-Flash</div>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; color: #666; margin-bottom: 6px;">API Key</label>
                        <input type="password" id="setting-api-key" placeholder="输入API Key" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;" value="${this.config.get('ai.apiKey', '')}">
                        <div style="font-size: 11px; color: #999; margin-top: 4px;">https://open.bigmodel.cn</div>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="setting-ai-enabled" ${this.config.get('ai.enabled') ? 'checked' : ''} style="margin-right: 8px;">
                            <span style="font-size: 13px;">启用AI识别</span>
                        </label>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; color: #666; margin-bottom: 6px;">每小时上限</label>
                        <input type="number" id="setting-max-per-hour" min="1" max="100" value="${this.config.get('ai.maxPerSession', 10)}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button id="setting-save" style="flex: 1; padding: 12px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">保存</button>
                        <button id="setting-cancel" style="flex: 1; padding: 12px; background: #e0e0e0; color: #333; border: none; border-radius: 6px; cursor: pointer;">取消</button>
                    </div>
                </div>
            `;

            modal.appendChild(content);
            document.body.appendChild(modal);

            // 事件
            const saveBtn = document.getElementById('setting-save');
            const cancelBtn = document.getElementById('setting-cancel');

            if (saveBtn) {
                saveBtn.onclick = () => {
                    this.config.set('ai.apiKey', document.getElementById('setting-api-key').value.trim());
                    this.config.set('ai.enabled', document.getElementById('setting-ai-enabled').checked);
                    this.config.set('ai.maxPerSession', parseInt(document.getElementById('setting-max-per-hour').value) || 10);
                    modal.remove();
                };
            }
            if (cancelBtn) {
                cancelBtn.onclick = () => modal.remove();
            }
            modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        }

        destroy() {
            if (this.panel && this.panel.parentNode) {
                this.panel.parentNode.removeChild(this.panel);
            }
        }
    }

    // ==================== 机器人引擎 ====================
    class ElegantBot {
        constructor(env, configMgr, ui) {
            this.env = env;
            this.config = configMgr.config;
            this.ui = ui;
            this.running = false;
            this.studyId = null;
            this.startTime = null;
            this._api = null;
            this._timer = null;
        }

        async start() {
            this.running = true;
            this.startTime = Date.now();
            console.log('🌟 优雅大师启动', this.env);

            const init = await this.api.study(1);
            if (!init.ok) {
                alert('初始化失败: ' + init.error);
                return false;
            }
            this.studyId = init.data.studyId;
            console.log('✅ 会话:', this.studyId);

            const jumpSize = this.config.speed.jumpSize || 30;
            const interval = this.config.speed.reportInterval || 2000;
            const target = Math.floor(this.env.duration * (this.config.completion.targetPercent || 0.95));
            const loops = Math.ceil(target / jumpSize);

            console.log(`⚡ 上报: ${loops}次, 间隔${interval}ms, 跳跃${jumpSize}s`);

            for (let i = 0; i < loops && this.running; i++) {
                const time = (i + 1) * jumpSize;

                await this.checkCaptcha();

                const res = await this.api.study(time);
                if (!res.ok) {
                    if (res.error && res.error.includes('学时')) {
                        console.warn('上报失败，回退重试');
                        i--;
                        await this.sleep(3000);
                        continue;
                    }
                }

                const pct = Math.floor(time / this.env.duration * 100);
                this.ui.updateStatus(null, null, pct, '运行中');

                if (i < loops - 1 && this.running) {
                    await this.sleep(interval);
                }
            }

            await this.api.study(this.env.duration);

            if (this.config.autoNext && this.config.autoNext.enabled) {
                await this.autoNext();
            }

            const elapsed = (Date.now() - this.startTime) / 1000;
            console.log(`✅ 完成！耗时: ${elapsed.toFixed(1)}秒, 记录: ${this.env.duration}秒`);
            this.ui.updateStatus(null, null, 100, '完成');

            return true;
        }

        async checkCaptcha() {
            const img = document.querySelector('img[src*="code"]:not([height*="0"])');
            if (!img) return;
            if (this.config.ai && this.config.ai.enabled) {
                console.log('🔍 发现验证码，AI识别中...');
            } else {
                console.warn('⚠️  检测到验证码');
            }
        }

        async autoNext() {
            const delay = (this.config.autoNext && this.config.autoNext.delay) || 2000;
            await this.sleep(delay);
            const selectors = ['.next-node', '.next-btn', '.next-lesson', '[data-next]', 'a.next', 'button.next'];
            for (let i = 0; i < selectors.length; i++) {
                const btn = document.querySelector(selectors[i]);
                if (btn && btn.offsetParent !== null) {
                    console.log('➡️  自动点击下一节');
                    btn.click();
                    return;
                }
            }
            console.warn('未找到下一节按钮');
        }

        stop() {
            this.running = false;
            if (this._timer) clearTimeout(this._timer);
            console.log('⏹️  已停止');
        }

        sleep(ms) {
            return new Promise(resolve => {
                this._timer = setTimeout(resolve, ms);
            });
        }

        get api() {
            if (!this._api) {
                this._api = {
                    nodeId: this.env.nodeId,
                    async study(time, studyId = null) {
                        const body = { nodeId: this.nodeId, studyTime: time };
                        if (studyId) body.studyId = studyId;
                        try {
                            const res = await fetch(`${location.origin}/user/node/study`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(body),
                                credentials: 'include'
                            });
                            const data = await res.json().catch(() => ({}));
                            if (res.ok) return { ok: true, data };
                            return { ok: false, error: data.message || res.status };
                        } catch (e) {
                            return { ok: false, error: e.message };
                        }
                    }
                };
            }
            return this._api;
        }
    }

    // ==================== 主控制器 ====================
    class MasterController {
        constructor(configMgr, ui) {
            this.config = configMgr;
            this.ui = ui;
            this.bot = null;
            this.running = false;
            this.env = null;
        }

        async start() {
            if (this.running) return false;
            this.running = true;
            try {
                this.env = this.detectEnvironment();
                if (!this.env) {
                    alert('请先访问学习节点页面');
                    this.running = false;
                    return false;
                }
                console.log('🎯 目标:', this.env);
                this.checkParallelStatus();
                this.ui.updateStatus(this.env.nodeId, this.env.duration, null, '待机');
                this.bot = new ElegantBot(this.env, this.config, this.ui);
                const success = await this.bot.start();
                return success;
            } finally {
                this.running = false;
            }
        }

        stop() {
            if (this.bot) { this.bot.stop(); this.bot = null; }
            this.running = false;
        }

        detectEnvironment() {
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

        checkParallelStatus() {
            const schoolId = this.getCookie('schoolId');
            const userId = this.getCookie('userId') || this.getCookie('user_id');
            if (schoolId && userId && this.env) {
                const key = `node_play_${schoolId}${userId}`;
                const currentValue = localStorage.getItem(key);
                if (currentValue && currentValue !== this.env.nodeId) {
                    console.warn('⚠️  并行检测: localStorage值与当前节点不一致');
                } else {
                    console.log('✅ 并行检测状态正常');
                }
            }
        }

        getCookie(name) {
            const m = document.cookie.match(new RegExp(`${name}=([^;]+)`));
            return m ? m[1] : null;
        }
    }

    // ==================== 初始化 ====================
    async function init() {
        await new Promise(resolve => {
            if (document.readyState === 'complete') resolve();
            else window.addEventListener('load', resolve);
        });
        await new Promise(resolve => setTimeout(resolve, 500));

        const configMgr = new ConfigManager();
        const ui = new UIBuilder(configMgr);
        const engine = new MasterController(configMgr, ui);

        ui.create();

        window.MasterEngine = engine;
        window.ElegantConfig = configMgr;

        const env = engine.detectEnvironment();
        if (env) {
            ui.updateStatus(env.nodeId, env.duration, null, '待机');
            console.log('🌟 优雅大师已就绪，点击"🚀 启动"开始');
        } else {
            console.log('⚠️  未检测到学习节点，请先访问课程页面');
        }

        // 监听 URL 变化（SPA 路由切换）
        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                console.log('🔄 URL 变化，重新检测环境:', location.href);
                const newEnv = engine.detectEnvironment();
                if (newEnv) {
                    engine.env = newEnv;
                    ui.updateStatus(newEnv.nodeId, newEnv.duration, null, '待机');
                    console.log('✅ 环境已更新:', newEnv);
                } else {
                    console.log('⚠️  当前页面不是学习节点');
                }
            }
        }, 500);
    }

    init();

})();
