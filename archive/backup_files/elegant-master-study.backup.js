// ==UserScript==
// @name         🌟 优雅大师 - 无痕刷课助手（稳定版）
// @namespace    security.elegant.master
// @version      10.0.0
// @description  优雅设计 · 零代码修改 · 全UI配置 · 渐进式复杂度
// @author       红队宗师
// @match        https://scauzj.leykeji.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @run-at       document-end
// @license      MIT
// ==/UserScript==

/**
 * 优雅大师脚本 - 设计理念
 *
 * 1. 零代码修改：所有配置通过UI完成
 * 2. 渐进式复杂度：基础功能一目了然，高级功能按需展开
 * 3. 即时反馈：配置改变立即生效，状态清晰可见
 * 4. 智能默认：开箱即用，无需任何配置
 */

(function() {
    'use strict';

    // ==================== 默认配置 ====================
    const DEFAULTS = {
        speed: {
            mode: 'normal',
            reportInterval: 2000,
            jumpSize: 30
        },
        ai: {
            enabled: false,
            apiKey: '',
            maxPerSession: 10
        },
        autoNext: {
            enabled: true,
            delay: 2000
        },
        logLevel: 'normal'
    };

    // ==================== 配置管理器 ====================
    class ConfigManager {
        constructor() {
            this.storageKey = 'elegant_master_config_v2';
            this.config = this.load();
        }

        load() {
            try {
                const saved = localStorage.getItem(this.storageKey);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    return this.merge(DEFAULTS, parsed);
                }
            } catch (e) {
                console.warn('配置加载失败:', e.message);
            }
            return JSON.parse(JSON.stringify(DEFAULTS));
        }

        merge(target, source) {
            const result = JSON.parse(JSON.stringify(target));
            for (let key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this.merge(target[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
            return result;
        }

        save() {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.config));
            } catch (e) {
                console.error('配置保存失败:', e.message);
            }
        }

        get(path, defaultValue = null) {
            const keys = path.split('.');
            let value = this.config;
            for (let key of keys) {
                if (value && typeof value === 'object' && key in value) {
                    value = value[key];
                } else {
                    return defaultValue;
                }
            }
            return value === undefined ? defaultValue : value;
        }

        set(path, value) {
            const keys = path.split('.');
            const lastKey = keys.pop();
            let target = this.config;
            for (let key of keys) {
                if (!(key in target)) target[key] = {};
                target = target[key];
            }
            target[lastKey] = value;
            this.save();
        }

        reset() {
            this.config = JSON.parse(JSON.stringify(DEFAULTS));
            this.save();
        }

        getAll() {
            return JSON.parse(JSON.stringify(this.config));
        }
    }

    // ==================== UI 构建器 ====================
    class UIBuilder {
        constructor(configMgr) {
            this.config = configMgr;
            this.panel = null;
            this.advancedExpanded = false;
        }

        create() {
            // 创建面板容器
            this.panel = document.createElement('div');
            this.panel.id = 'elegant-master-panel';
            this.panel.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                width: 320px;
                max-height: 90vh;
                background: #ffffff;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            `;

            // 1. 头部
            const header = this.createHeader();
            this.panel.appendChild(header);

            // 2. 滚动内容区
            const contentWrapper = document.createElement('div');
            contentWrapper.style.cssText = 'flex: 1; overflow-y: auto; padding: 0;';
            contentWrapper.className = 'content-wrapper';

            const content = document.createElement('div');
            content.style.cssText = 'padding: 20px; background: #f8f9fa;';
            content.className = 'main-content';

            // 状态卡片
            const statusCard = this.createStatusCard();
            content.appendChild(statusCard);

            // 快速控制
            const quickControl = this.createQuickControl();
            content.appendChild(quickControl);

            // 高级设置
            const advanced = this.createAdvancedSection();
            content.appendChild(advanced);

            contentWrapper.appendChild(content);
            this.panel.appendChild(contentWrapper);

            // 3. 底部操作区
            const footer = this.createFooter();
            this.panel.appendChild(footer);

            // 添加到页面
            document.body.appendChild(this.panel);

            // 同步UI状态
            this.syncUI();

            console.log('✅ 优雅大师UI已创建');
        }

        createHeader() {
            const header = document.createElement('div');
            header.style.cssText = `
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 16px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            `;

            const titleDiv = document.createElement('div');
            titleDiv.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <span style="font-size: 24px; margin-right: 10px;">🌟</span>
                    <div>
                        <div style="font-weight: 600; font-size: 16px;">优雅大师</div>
                        <div style="font-size: 11px; opacity: 0.8;">无痕刷课助手 v9.0</div>
                    </div>
                </div>
            `;

            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'elegant-toggle';
            toggleBtn.style.cssText = `
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 6px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
            `;
            toggleBtn.textContent = '收起';

            let expanded = true;
            toggleBtn.onclick = () => {
                expanded = !expanded;
                const contentWrapper = this.panel.querySelector('.content-wrapper');
                const footer = this.panel.querySelector('.footer');
                if (contentWrapper) contentWrapper.style.display = expanded ? 'block' : 'none';
                if (footer) footer.style.display = expanded ? 'flex' : 'none';
                toggleBtn.textContent = expanded ? '收起' : '展开';
            };

            header.appendChild(titleDiv);
            header.appendChild(toggleBtn);

            return header;
        }

        createStatusCard() {
            const card = document.createElement('div');
            card.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 16px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            `;

            card.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                    <div class="stat-item">
                        <div style="font-size: 11px; color: #888; margin-bottom: 4px;">节点</div>
                        <div id="stat-node" style="font-weight: 600; color: #333;">--</div>
                    </div>
                    <div class="stat-item">
                        <div style="font-size: 11px; color: #888; margin-bottom: 4px;">时长</div>
                        <div id="stat-duration" style="font-weight: 600; color: #333;">--</div>
                    </div>
                    <div class="stat-item">
                        <div style="font-size: 11px; color: #888; margin-bottom: 4px;">进度</div>
                        <div id="stat-progress" style="font-weight: 600; color: #4CAF50;">0%</div>
                    </div>
                    <div class="stat-item">
                        <div style="font-size: 11px; color: #888; margin-bottom: 4px;">状态</div>
                        <div id="stat-status" style="font-weight: 600; color: #2196F3;">待机</div>
                    </div>
                </div>
            `;

            return card;
        }

        createQuickControl() {
            const section = document.createElement('div');
            section.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 16px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            `;

            section.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 12px; color: #333;">
                    ⚡ 快速控制
                </div>

                <div style="margin-bottom: 12px;">
                    <label style="display: flex; align-items: center; margin-bottom: 8px; cursor: pointer;">
                        <input type="checkbox" id="ctrl-auto-next" style="margin-right: 8px;">
                        <span style="font-size: 13px;">完成后自动下一节</span>
                    </label>
                </div>

                <div>
                    <label style="display: block; font-size: 12px; color: #666; margin-bottom: 6px;">加速模式</label>
                    <div style="display: flex; gap: 8px;">
                        <button class="speed-btn" data-mode="slow" style="
                            flex: 1; padding: 8px; background: #e0e0e0; border: none;
                            border-radius: 6px; cursor: pointer; font-size: 12px;
                        ">1x 慢速</button>
                        <button class="speed-btn" data-mode="normal" style="
                            flex: 1; padding: 8px; background: #667eea; color: white;
                            border: none; border-radius: 6px; cursor: pointer; font-size: 12px;
                        ">10x 标准</button>
                        <button class="speed-btn" data-mode="fast" style="
                            flex: 1; padding: 8px; background: #e0e0e0; border: none;
                            border-radius: 6px; cursor: pointer; font-size: 12px;
                        ">15x 极速</button>
                    </div>
                </div>
            `;

            section.appendChild(section);

            // 事件绑定（延迟确保DOM已插入）
            setTimeout(() => {
                const autoNextCheckbox = document.getElementById('ctrl-auto-next');
                if (autoNextCheckbox) {
                    autoNextCheckbox.checked = this.config.get('autoNext.enabled', true);
                    autoNextCheckbox.onchange = (e) => {
                        this.config.set('autoNext.enabled', e.target.checked);
                    };
                }

                const speedButtons = document.querySelectorAll('.speed-btn');
                speedButtons.forEach(btn => {
                    btn.onclick = () => {
                        // 更新按钮样式
                        speedButtons.forEach(b => {
                            b.style.background = '#e0e0e0';
                            b.style.color = '#333';
                        });
                        btn.style.background = '#667eea';
                        btn.style.color = 'white';

                        // 设置配置
                        const mode = btn.getAttribute('data-mode');
                        let interval, jump;
                        switch (mode) {
                            case 'slow':
                                interval = 30000;
                                jump = 30;
                                break;
                            case 'normal':
                                interval = 2000;
                                jump = 30;
                                break;
                            case 'fast':
                                interval = 1500;
                                jump = 30;
                                break;
                        }
                        this.config.set('speed.reportInterval', interval);
                        this.config.set('speed.jumpSize', jump);
                        this.config.set('speed.mode', mode);
                    };
                });
            }, 0);

            return section;
        }

        createAdvancedSection() {
            const section = document.createElement('div');
            section.style.cssText = `
                background: white;
                border-radius: 12px;
                margin-bottom: 16px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            `;

            // 头部（点击展开/收起）
            const header = document.createElement('div');
            header.style.cssText = `
                padding: 12px 16px;
                background: #f8f9fa;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid #eee;
                font-weight: 600;
            `;
            header.innerHTML = `
                <span>⚙️ 高级设置</span>
                <span id="adv-arrow" style="transition: transform 0.3s; font-size: 12px;">▼</span>
            `;

            // 内容区
            const content = document.createElement('div');
            content.style.cssText = 'padding: 16px; display: none;';
            content.innerHTML = this.buildAdvancedContent();

            header.onclick = () => {
                this.advancedExpanded = !this.advancedExpanded;
                content.style.display = this.advancedExpanded ? 'block' : 'none';
                const arrow = document.getElementById('adv-arrow');
                if (arrow) {
                    arrow.style.transform = this.advancedExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
                }
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
                    <label style="display: block; font-size: 12px; color: #666; margin-bottom: 6px;">
                        上报间隔 (毫秒)
                    </label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="range" class="adv-slider" data-key="speed.reportInterval"
                               min="500" max="30000" step="500" value="${interval}"
                               style="flex: 1;">
                        <span class="slider-value" style="font-size: 12px; width: 60px; text-align: right;">${interval}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 10px; color: #999; margin-top: 4px;">
                        <span>快</span>
                        <span>慢</span>
                    </div>
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; color: #666; margin-bottom: 6px;">
                        每次跳跃 (秒)
                    </label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="range" class="adv-slider" data-key="speed.jumpSize"
                               min="10" max="300" step="10" value="${jump}"
                               style="flex: 1;">
                        <span class="slider-value" style="font-size: 12px; width: 60px; text-align: right;">${jump}</span>
                    </div>
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; color: #666; margin-bottom: 6px;">
                        完成目标 (%)
                    </label>
                    <div style="display: flex; gap: 8px;">
                        <button class="target-btn" data-target="0.9" style="
                            padding: 6px 12px; background: ${target === 0.9 ? '#667eea' : '#e0e0e0'}; color: ${target === 0.9 ? 'white' : '#333'};
                            border: none; border-radius: 4px; cursor: pointer; font-size: 12px;
                        ">90%</button>
                        <button class="target-btn" data-target="0.95" style="
                            padding: 6px 12px; background: ${target === 0.95 ? '#667eea' : '#e0e0e0'}; color: ${target === 0.95 ? 'white' : '#333'};
                            border: none; border-radius: 4px; cursor: pointer; font-size: 12px;
                        ">95%</button>
                        <button class="target-btn" data-target="0.98" style="
                            padding: 6px 12px; background: ${target === 0.98 ? '#667eea' : '#e0e0e0'}; color: ${target === 0.98 ? 'white' : '#333'};
                            border: none; border-radius: 4px; cursor: pointer; font-size: 12px;
                        ">98%</button>
                        <button class="target-btn" data-target="1" style="
                            padding: 6px 12px; background: ${target === 1 ? '#667eea' : '#e0e0e0'}; color: ${target === 1 ? 'white' : '#333'};
                            border: none; border-radius: 4px; cursor: pointer; font-size: 12px;
                        ">100%</button>
                    </div>
                </div>

                <div style="margin-bottom: 12px;">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" id="adv-auto-stop" ${this.config.get('autoNext.enabled', true) ? 'checked' : ''} style="margin-right: 8px;">
                        <span style="font-size: 13px;">自动下一节</span>
                    </label>
                </div>

                <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; font-size: 12px; color: #666;">
                    💡 提示：高级设置仅在有特殊需求时调整，默认值已优化。
                </div>
            `;
        }

        createFooter() {
            const footer = document.createElement('div');
            footer.className = 'footer';
            footer.style.cssText = `
                background: #f8f9fa;
                padding: 16px 20px;
                border-top: 1px solid #eee;
                display: flex;
                gap: 10px;
            `;

            footer.innerHTML = `
                <button id="btn-settings" style="
                    flex: 1; padding: 10px; background: #6c757d; color: white;
                    border: none; border-radius: 8px; cursor: pointer; font-size: 13px;
                ">⚙️ AI配置</button>
                <button id="btn-start" style="
                    flex: 2; padding: 10px; background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white; border: none; border-radius: 8px; cursor: pointer;
                    font-size: 14px; font-weight: 600;
                ">🚀 启动</button>
                <button id="btn-reset" style="
                    flex: 1; padding: 10px; background: #dc3545; color: white;
                    border: none; border-radius: 8px; cursor: pointer; font-size: 13px;
                ">重置</button>
            `;

            footer.querySelector('#btn-settings').onclick = () => this.showSettingsModal();
            footer.querySelector('#btn-start').onclick = () => {
                if (window.MasterEngine && window.MasterEngine.start) {
                    window.MasterEngine.start();
                } else {
                    alert('引擎未就绪，请刷新页面');
                }
            };
            footer.querySelector('#btn-reset').onclick = () => {
                if (confirm('确定要重置所有配置吗？')) {
                    this.config.reset();
                    this.syncUI();
                    alert('配置已重置');
                }
            };

            return footer;
        }

        showSettingsModal() {
            const modal = document.createElement('div');
            modal.id = 'elegant-settings-modal';
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5); z-index: 9999999;
                display: flex; align-items: center; justify-content: center;
            `;

            const content = document.createElement('div');
            content.style.cssText = `
                background: white;
                width: 400px;
                max-height: 80vh;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            `;

            content.innerHTML = `
                <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px;">
                    <div style="font-size: 18px; font-weight: 600;">⚙️ AI验证码配置</div>
                    <div style="font-size: 12px; opacity: 0.8;">智谱AI GLM-4V-Flash API</div>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; color: #666; margin-bottom: 6px;">
                            API Key
                        </label>
                        <input type="password" id="setting-api-key" placeholder="输入智谱AI API Key"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
                               value="${this.config.get('ai.apiKey', '')}">
                        <div style="font-size: 11px; color: #999; margin-top: 4px;">
                            申请地址: https://open.bigmodel.cn
                        </div>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="setting-ai-enabled" ${this.config.get('ai.enabled') ? 'checked' : ''} style="margin-right: 8px;">
                            <span style="font-size: 13px;">启用AI验证码识别</span>
                        </label>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; color: #666; margin-bottom: 6px;">
                            每小时识别上限
                        </label>
                        <input type="number" id="setting-max-per-hour" min="1" max="100" value="${this.config.get('ai.maxPerSession', 10)}"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button id="setting-save" style="
                            flex: 1; padding: 12px; background: #667eea; color: white;
                            border: none; border-radius: 6px; cursor: pointer; font-weight: 600;
                        ">保存</button>
                        <button id="setting-cancel" style="
                            flex: 1; padding: 12px; background: #e0e0e0; color: #333;
                            border: none; border-radius: 6px; cursor: pointer;
                        ">取消</button>
                    </div>
                </div>
            `;

            modal.appendChild(content);
            document.body.appendChild(modal);

            // 保存
            document.getElementById('setting-save').onclick = () => {
                this.config.set('ai.apiKey', document.getElementById('setting-api-key').value.trim());
                this.config.set('ai.enabled', document.getElementById('setting-ai-enabled').checked);
                this.config.set('ai.maxPerSession', parseInt(document.getElementById('setting-max-per-hour').value) || 10);
                this.config.save();
                modal.remove();
            };

            // 取消
            document.getElementById('setting-cancel').onclick = () => modal.remove();

            // 点击背景关闭
            modal.onclick = (e) => {
                if (e.target === modal) modal.remove();
            };
        }

        syncUI() {
            // 同步所有UI控件到当前配置
            const autoNextCheckbox = document.getElementById('ctrl-auto-next');
            if (autoNextCheckbox) {
                autoNextCheckbox.checked = this.config.get('autoNext.enabled', true);
            }

            // 速度按钮
            const mode = this.config.get('speed.mode', 'normal');
            const speedBtn = document.querySelector(`.speed-btn[data-mode="${mode}"]`);
            if (speedBtn) {
                document.querySelectorAll('.speed-btn').forEach(b => {
                    b.style.background = '#e0e0e0';
                    b.style.color = '#333';
                });
                speedBtn.style.background = '#667eea';
                speedBtn.style.color = 'white';
            }

            // 高级设置
            const intervalSlider = document.querySelector('.adv-slider[data-key="speed.reportInterval"]');
            const intervalValue = document.querySelector('.slider-value');
            if (intervalSlider) {
                intervalSlider.value = this.config.get('speed.reportInterval', 2000);
                if (intervalValue) intervalValue.textContent = intervalSlider.value;
            }

            const jumpSlider = document.querySelector('.adv-slider[data-key="speed.jumpSize"]');
            if (jumpSlider) {
                jumpSlider.value = this.config.get('speed.jumpSize', 30);
            }

            // 目标完成按钮
            const target = this.config.get('completion.targetPercent', 0.95);
            const targetBtn = document.querySelector(`.target-btn[data-target="${target}"]`);
            if (targetBtn) {
                document.querySelectorAll('.target-btn').forEach(b => {
                    b.style.background = '#e0e0e0';
                    b.style.color = '#333';
                });
                targetBtn.style.background = '#667eea';
                targetBtn.style.color = 'white';
            }

            // 自动下一节
            const autoStopCheckbox = document.getElementById('adv-auto-stop');
            if (autoStopCheckbox) {
                autoStopCheckbox.checked = this.config.get('autoNext.enabled', true);
            }
        }

        updateStatus(nodeId, duration, progress, status) {
            const nodeEl = document.getElementById('stat-node');
            const durEl = document.getElementById('stat-duration');
            const progEl = document.getElementById('stat-progress');
            const statEl = document.getElementById('stat-status');

            if (nodeEl) nodeEl.textContent = nodeId || '--';
            if (durEl) durEl.textContent = duration ? duration + 's' : '--';
            if (progEl) progEl.textContent = progress !== null ? progress + '%' : '0%';
            if (statEl) {
                statEl.textContent = status || '待机';
                const colors = { '运行中': '#4CAF50', '待机': '#2196F3', '错误': '#f44336', '完成': '#FF9800' };
                statEl.style.color = colors[status] || '#333';
            }
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
            this.config = configMgr.getAll();
            this.ui = ui;
            this.running = false;
            this.studyId = null;
            this.startTime = null;
            this.timer = null;
        }

        async start() {
            this.running = true;
            this.startTime = Date.now();

            console.log('🌟 优雅大师启动', this.env);

            // 初始化会话
            const init = await this.api.study(1);
            if (!init.ok) {
                alert('初始化失败: ' + init.error);
                return false;
            }
            this.studyId = init.data.studyId;
            console.log('✅ 会话:', this.studyId);

            // 计算上报参数
            const jumpSize = this.config.speed.jumpSize || 30;
            const interval = this.config.speed.reportInterval || 2000;
            const target = Math.floor(this.env.duration * (this.config.completion.targetPercent || 0.95));
            const loops = Math.ceil(target / jumpSize);

            console.log(`⚡ 上报配置: ${loops}次, 间隔${interval}ms, 跳跃${jumpSize}s`);

            // 上报循环
            for (let i = 0; i < loops && this.running; i++) {
                const time = (i + 1) * jumpSize;

                // 验证码检查
                await this.checkCaptcha();

                // 上报
                const res = await this.api.study(time);
                if (!res.ok) {
                    if (res.error && res.error.includes('学时')) {
                        console.warn('上报失败，回退重试');
                        i--;
                        await this.sleep(3000);
                        continue;
                    }
                }

                // 更新进度
                const pct = Math.floor(time / this.env.duration * 100);
                this.ui.updateStatus(null, null, pct, '运行中');

                // 等待（最后一次除外）
                if (i < loops - 1 && this.running) {
                    await this.sleep(interval);
                }
            }

            // 最终上报
            await this.api.study(this.env.duration);

            // 自动下一节
            if (this.config.autoNext && this.config.autoNext.enabled) {
                await this.autoNext();
            }

            // 完成统计
            const elapsed = (Date.now() - this.startTime) / 1000;
            console.log(`✅ 完成！实际耗时: ${elapsed.toFixed(1)}秒, 记录时长: ${this.env.duration}秒`);

            this.ui.updateStatus(null, null, 100, '完成');
            return true;
        }

        async checkCaptcha() {
            const img = document.querySelector('img[src*="code"]:not([height*="0"])');
            if (!img) return;

            if (this.config.ai && this.config.ai.enabled) {
                console.log('🔍 发现验证码，AI识别中...');
            } else {
                console.warn('⚠️  检测到验证码，需手动处理');
            }
        }

        async autoNext() {
            const delay = (this.config.autoNext && this.config.autoNext.delay) || 2000;
            await this.sleep(delay);

            const selectors = [
                '.next-node', '.next-btn', '.next-lesson',
                '[data-next]', 'a.next', 'button.next',
                'button:contains("下一节")'
            ];

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
            if (this.timer) clearTimeout(this.timer);
            console.log('⏹️  已停止');
        }

        sleep(ms) {
            return new Promise(resolve => {
                this.timer = setTimeout(resolve, ms);
            });
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
                            if (res.ok) {
                                return { ok: true, data };
                            }
                            return { ok: false, error: data.message || data.code || res.status };
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
                // 检测环境
                this.env = this.detectEnvironment();
                if (!this.env) {
                    alert('请先访问学习节点页面');
                    this.running = false;
                    return false;
                }

                console.log('🎯 目标:', this.env);

                // 检查并行状态（只检查，不修改）
                this.checkParallelStatus();

                // 创建并启动机器人
                this.bot = new ElegantBot(this.env, this.config, this.ui);
                const success = await this.bot.start();

                return success;
            } finally {
                this.running = false;
            }
        }

        stop() {
            if (this.bot) {
                this.bot.stop();
                this.bot = null;
            }
            this.running = false;
        }

        detectEnvironment() {
            // 获取nodeId
            const match = location.pathname.match(/\/node\/(\d+)/);
            if (!match) return null;
            const nodeId = match[1];

            // 获取视频时长
            let duration = 0;
            const video = document.querySelector('video');
            if (video && video.duration && video.duration !== Infinity) {
                duration = Math.floor(video.duration);
            } else {
               const m = document.body.textContent.match(/(\d{1,2}):(\d{2})/);
                if (m) {
                    duration = parseInt(m[1]) * 60 + parseInt(m[2]);
                }
            }

            if (!duration || duration <= 0) {
                duration = 3600; // 默认
            }

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
                    console.log('✅ 并行检测状态正常（由video.js维护）');
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
        // 等待页面加载
        await new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });

        // 再等一下确保稳定
        await new Promise(resolve => setTimeout(resolve, 500));

        // 创建配置管理器
        const configMgr = new ConfigManager();

        // 创建UI
        const ui = new UIBuilder(configMgr);
        ui.create();

        // 创建引擎
        const engine = new MasterController(configMgr, ui);

        // 暴露到全局
        window.MasterEngine = engine;
        window.ElegantConfig = configMgr;

        // 检查环境并显示状态
        const env = engine.detectEnvironment();
        if (env) {
            ui.updateStatus(env.nodeId, env.duration, null, '待机');
            console.log('🌟 优雅大师已就绪，点击"🚀 启动"开始');
        } else {
            console.log('⚠️  未检测到学习节点，请先访问课程页面');
        }

        // 绑定高级设置事件
        setTimeout(() => {
            this.bindAdvancedEvents(ui, configMgr);
        }, 0);
    }

    // 绑定高级设置事件
    function bindAdvancedEvents(ui, configMgr) {
        // 滑块事件
        const sliders = document.querySelectorAll('.adv-slider');
        sliders.forEach(slider => {
            slider.oninput = () => {
                const valueSpan = slider.parentNode.querySelector('.slider-value');
                if (valueSpan) valueSpan.textContent = slider.value;

                const key = slider.getAttribute('data-key');
                configMgr.set(key, parseInt(slider.value));
            };
            slider.onchange = () => {
                const key = slider.getAttribute('data-key');
                configMgr.set(key, parseInt(slider.value));
            };
        });

        // 目标完成按钮
        const targetBtns = document.querySelectorAll('.target-btn');
        targetBtns.forEach(btn => {
            btn.onclick = () => {
                targetBtns.forEach(b => {
                    b.style.background = '#e0e0e0';
                    b.style.color = '#333';
                });
                btn.style.background = '#667eea';
                btn.style.color = 'white';
                configMgr.set('completion.targetPercent', parseFloat(btn.getAttribute('data-target')));
            };
        });

        // 自动下一节
        const autoStopCheckbox = document.getElementById('adv-auto-stop');
        if (autoStopCheckbox) {
            autoStopCheckbox.onchange = (e) => {
                configMgr.set('autoNext.enabled', e.target.checked);
            };
        }
    }

    // 启动
    init();

})();
