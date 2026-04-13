
(function() {

const ELEGANT_VERSION = 'v2.0-hotreload';

// == GM API 兼容层 ==
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

    const DEFAULTS = {
        speed: { mode: 'normal', reportInterval: 2000, jumpSize: 30 },
        ai: { enabled: true, apiKey: '', maxPerSession: 10, ocrSpaceKey: 'K88766094088957' },
        autoNext: { enabled: true, delay: 2000 },
        completion: { targetPercent: 0.95 }
    };

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

    // ==================== OCR 三重降级引擎 ====================
    class OCREngine {
        constructor(configMgr) {
            this.config = configMgr;
            this.apiKey = configMgr.get('ai.ocrSpaceKey', 'K88766094088957');
            this.THRESHOLDS = [80, 100, 120, 140, 160];
            this.SCALE_FACTOR = 4;
            this.maxRetries = 8;
        }

        async solveWithRetry(getCaptchaImg, fillInput, submitLogin) {
            for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
                console.log(`🔍 验证码识别尝试 ${attempt}/${this.maxRetries}`);
                const imgElement = getCaptchaImg();
                if (!imgElement) { console.warn('⚠️ 未找到验证码图片'); continue; }

                try {
                    const code = await this.recognize(imgElement);
                    if (code && code.length >= 3) {
                        console.log(`✅ 识别成功: ${code} (第${attempt}次尝试)`);
                        fillInput(code);
                        const loginOk = await submitLogin();
                        if (loginOk) return true;
                        console.warn('⚠️ 验证码错误，换下一个重试');
                    } else {
                        console.warn(`⚠️ 第${attempt}次识别无有效结果，刷新验证码`);
                    }
                } catch (e) {
                    console.warn(`⚠️ 第${attempt}次识别失败: ${e.message}`);
                }

                const captchaImg = document.getElementById('codeImg');
                if (captchaImg) { captchaImg.click(); await new Promise(r => setTimeout(r, 1500)); }
            }
            console.error(`❌ ${this.maxRetries}次尝试均失败，请手动输入`);
            return false;
        }

        async recognize(imgElement) {
            if (!imgElement) throw new Error("未找到图片元素");
            console.log("[OCR] 开始双重降级识别 (4x缩放+六路预处理+反色)...");

            const scaled = this._extractScaled(imgElement);
            const base64Raw = scaled.canvas.toDataURL('image/png').split(',')[1];
            const base64Grayscale = this._preprocessGrayscale(scaled.canvas);
            const base64Inverted = this._preprocessInvert(scaled.canvas);
            const sixWayImages = this._sixWayPreprocess(scaled.canvas);
            console.log(`[OCR] 原始${scaled.origW}x${scaled.origH} → 缩放${scaled.newW}x${scaled.newH}, 六路预处理+反色共${sixWayImages.length + 2}张图`);

            if (this.apiKey) {
                try {
                    console.log("[OCR] 第一重: OCR.space (4x缩放+灰度+反色+六路预处理)...");
                    const text = await this._tryOCRSpace(base64Raw, base64Grayscale, base64Inverted, sixWayImages);
                    if (text) return this._cleanText(text);
                } catch (e) {
                    console.warn("[OCR] OCR.space 失败:", e.message);
                }
            } else {
                console.log("[OCR] 未配置 OCR.space Key，跳过第一重");
            }

            try {
                console.log("[OCR] 第二重: Tesseract.js (本地离线)...");
                const text = await this._tryTesseract(imgElement);
                if (text) return this._cleanText(text);
            } catch (e) {
                console.error("[OCR] Tesseract.js 失败:", e.message);
            }

            throw new Error("所有 OCR 通道均识别失败");
        }

        _extractScaled(imgElement) {
            const origW = imgElement.naturalWidth || imgElement.width || 90;
            const origH = imgElement.naturalHeight || imgElement.height || 40;
            const newW = origW * this.SCALE_FACTOR;
            const newH = origH * this.SCALE_FACTOR;
            const canvas = document.createElement('canvas');
            canvas.width = newW;
            canvas.height = newH;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(imgElement, 0, 0, newW, newH);
            return { canvas, origW, origH, newW, newH };
        }

        _preprocessGrayscale(sourceCanvas) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = sourceCanvas.width;
            canvas.height = sourceCanvas.height;
            ctx.drawImage(sourceCanvas, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
                data[i] = data[i+1] = data[i+2] = gray;
            }
            ctx.putImageData(imgData, 0, 0);
            return canvas.toDataURL('image/png').split(',')[1];
        }

        _preprocessInvert(sourceCanvas) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = sourceCanvas.width;
            canvas.height = sourceCanvas.height;
            ctx.drawImage(sourceCanvas, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
                data[i] = data[i+1] = data[i+2] = 255 - gray;
            }
            ctx.putImageData(imgData, 0, 0);
            return canvas.toDataURL('image/png').split(',')[1];
        }

        _sixWayPreprocess(sourceCanvas) {
            const results = [];
            const ctx = sourceCanvas.getContext('2d');
            const origData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
            const w = sourceCanvas.width, h = sourceCanvas.height;

            for (const threshold of this.THRESHOLDS) {
                const imageData = new ImageData(w, h);
                const data = imageData.data;
                for (let i = 0; i < origData.data.length; i += 4) {
                    const brightness = 0.299 * origData.data[i] + 0.587 * origData.data[i+1] + 0.114 * origData.data[i+2];
                    const v = brightness > threshold ? 255 : 0;
                    data[i] = data[i+1] = data[i+2] = v;
                    data[i+3] = 255;
                }
                for (let y = 1; y < h - 1; y++) {
                    for (let x = 1; x < w - 1; x++) {
                        const idx = (y * w + x) * 4;
                        if (data[idx] === 0) {
                            let neighbors = 0;
                            for (let dy = -1; dy <= 1; dy++) {
                                for (let dx = -1; dx <= 1; dx++) {
                                    if (dx === 0 && dy === 0) continue;
                                    if (data[((y+dy)*w+(x+dx))*4] === 0) neighbors++;
                                }
                            }
                            if (neighbors < 2) { data[idx] = data[idx+1] = data[idx+2] = 255; }
                        }
                    }
                }
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = w;
                tempCanvas.height = h;
                tempCanvas.getContext('2d').putImageData(imageData, 0, 0);
                results.push({ threshold, base64: tempCanvas.toDataURL('image/png').split(',')[1] });
            }

            const invertedBinCanvas = document.createElement('canvas');
            invertedBinCanvas.width = w;
            invertedBinCanvas.height = h;
            const invCtx = invertedBinCanvas.getContext('2d');
            invCtx.drawImage(sourceCanvas, 0, 0);
            const invData = invCtx.getImageData(0, 0, w, h);
            const invPixels = invData.data;
            for (let i = 0; i < invPixels.length; i += 4) {
                const gray = 0.299 * invPixels[i] + 0.587 * invPixels[i+1] + 0.114 * invPixels[i+2];
                const v = gray < 120 ? 255 : 0;
                invPixels[i] = invPixels[i+1] = invPixels[i+2] = v;
                invPixels[i+3] = 255;
            }
            invCtx.putImageData(invData, 0, 0);
            results.push({ threshold: 'inv', base64: invertedBinCanvas.toDataURL('image/png').split(',')[1] });

            return results;
        }

        _cleanText(text) {
            if (!text) return "";
            return text.replace(/[\s\n\r]/g, '').trim();
        }

        async _tryOCRSpace(base64Raw, base64Grayscale, base64Inverted, sixWayImages) {
            const allResults = [];
            const candidates = [];

            if (base64Raw) {
                const rawResult = await this._callOCRSpace({ base64: base64Raw });
                if (rawResult) {
                    const cleaned = rawResult.replace(/[^a-zA-Z0-9]/g, '');
                    if (cleaned.length >= 3 && cleaned.length <= 6) candidates.push(cleaned);
                    allResults.push(rawResult);
                }
            }
            if (base64Grayscale) {
                const grayResult = await this._callOCRSpace({ base64: base64Grayscale });
                if (grayResult) {
                    const cleaned = grayResult.replace(/[^a-zA-Z0-9]/g, '');
                    if (cleaned.length >= 3 && cleaned.length <= 6) candidates.push(cleaned);
                    allResults.push(grayResult);
                }
            }

            if (candidates.length >= 2) {
                const same = candidates.every(c => c === candidates[0]);
                if (same) {
                    console.log(`[OCR] 原图+灰度交叉验证一致: ${candidates[0]}`);
                    return candidates[0];
                }
            }

            if (base64Inverted) {
                const invResult = await this._callOCRSpace({ base64: base64Inverted });
                if (invResult) {
                    const cleaned = invResult.replace(/[^a-zA-Z0-9]/g, '');
                    if (cleaned.length >= 3 && cleaned.length <= 6) {
                        if (candidates.includes(cleaned)) {
                            console.log(`[OCR] 反色与之前结果交叉验证: ${cleaned}`);
                            return cleaned;
                        }
                        candidates.push(cleaned);
                    }
                    allResults.push(invResult);
                }
            }

            for (const img of sixWayImages) {
                console.log(`[OCR] OCR.space 六路预处理 t=${img.threshold}...`);
                const result = await this._callOCRSpace({ base64: img.base64 });
                if (result) {
                    const cleaned = result.replace(/[^a-zA-Z0-9]/g, '');
                    if (cleaned.length >= 3 && cleaned.length <= 6) {
                        if (candidates.includes(cleaned)) {
                            console.log(`[OCR] 六路t=${img.threshold}与之前结果交叉验证: ${cleaned}`);
                            return cleaned;
                        }
                        candidates.push(cleaned);
                    }
                    allResults.push(result);
                }
            }

            const freq = {};
            for (const c of candidates) { freq[c] = (freq[c] || 0) + 1; }
            let best = null, bestCount = 0;
            for (const [text, count] of Object.entries(freq)) {
                if (count > bestCount) { best = text; bestCount = count; }
            }
            if (best && bestCount >= 2) {
                console.log(`[OCR] 多数投票结果: ${best} (${bestCount}次)`);
                return best;
            }

            if (candidates.length > 0) return candidates[0];
            for (const r of allResults) {
                const cleaned = r.replace(/[^a-zA-Z0-9]/g, '');
                if (cleaned.length >= 3) return cleaned;
            }
            return null;
        }

        async _callOCRSpace({ base64 }) {
            try {
                const params = {
                    apikey: this.apiKey,
                    language: 'eng',
                    isOverlayRequired: false,
                    scale: true,
                    OCREngine: 2
                };
                if (base64) params.base64Image = `data:image/png;base64,${base64}`;
                else return null;
                const res = await fetch('https://api.ocr.space/parse/image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams(params).toString()
                });
                const data = await res.json();
                if (data.IsErroredOnProcessing) return null;
                return data.ParsedResults?.[0]?.ParsedText?.replace(/[\s\n\r]/g, '') || null;
            } catch (e) { return null; }
        }

        async _tryTesseract(imgElement) {
            if (typeof Tesseract === 'undefined') {
                await this._loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', 'Tesseract.js');
            }
            if (typeof Tesseract === 'undefined') throw new Error("Tesseract.js 加载失败");

            const scaled = this._extractScaled(imgElement);
            const worker = await Tesseract.createWorker('eng');
            const ret = await worker.recognize(scaled.canvas);
            await worker.terminate();

            const grayCanvas = document.createElement('canvas');
            grayCanvas.width = scaled.canvas.width;
            grayCanvas.height = scaled.canvas.height;
            const gCtx = grayCanvas.getContext('2d');
            gCtx.drawImage(scaled.canvas, 0, 0);
            const gData = gCtx.getImageData(0, 0, grayCanvas.width, grayCanvas.height);
            const gPixels = gData.data;
            for (let i = 0; i < gPixels.length; i += 4) {
                const gray = 0.299 * gPixels[i] + 0.587 * gPixels[i+1] + 0.114 * gPixels[i+2];
                const v = gray > 128 ? 255 : 0;
                gPixels[i] = gPixels[i+1] = gPixels[i+2] = v;
            }
            gCtx.putImageData(gData, 0, 0);

            const worker2 = await Tesseract.createWorker('eng');
            const ret2 = await worker2.recognize(grayCanvas);
            await worker2.terminate();

            const text1 = (ret.data.text || '').replace(/[^a-zA-Z0-9]/g, '');
            const text2 = (ret2.data.text || '').replace(/[^a-zA-Z0-9]/g, '');
            console.log(`[OCR] Tesseract 原图: ${text1}, 二值化: ${text2}`);

            if (text1 === text2 && text1.length >= 3) return text1;
            if (text2.length >= 3 && text2.length <= 6) return text2;
            if (text1.length >= 3 && text1.length <= 6) return text1;
            return text2 || text1 || null;
        }

        _loadScript(url, name) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.onload = () => { console.log(`[OCR] ${name} 加载成功`); resolve(); };
                script.onerror = () => reject(new Error(`${name} 加载失败`));
                document.head.appendChild(script);
            });
        }
    }

    // ==================== UI 构建器 ====================
    class UIBuilder {
        constructor(configMgr) {
            this.config = configMgr;
            this.panel = null;
            this.elements = {};
            this._engine = null;
            this._lastNodeId = null;
            this._lastDuration = null;
        }

        setEngine(engine) {
            this._engine = engine;
        }

        create() {
            this.panel = document.createElement('div');
            this.panel.id = 'elegant-master-panel';
            this.panel.style.cssText = `
                position: fixed; top: 20px; right: 20px; width: 320px; max-height: 90vh;
                background: #fff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                z-index: 2147483647; font-family: -apple-system, sans-serif; font-size: 14px;
                overflow: hidden; display: flex; flex-direction: column;
                pointer-events: auto;
            `;

            const header = this.buildHeader();
            const contentWrapper = this.buildContentWrapper();
            const footer = this.buildFooter();

            this.panel.appendChild(header);
            this.panel.appendChild(contentWrapper);
            this.panel.appendChild(footer);
            document.body.appendChild(this.panel);

            this.cacheElements();
            this.bindEvents();
            this.syncUI();

            console.log('✅ 优雅大师UI创建成功');
        }

        buildHeader() {
            const header = document.createElement('div');
            header.style.cssText = `
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white; padding: 16px 20px;
                display: flex; align-items: center; justify-content: space-between;
                cursor: move;
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
                <div id="progress-bar-container" style="height: 6px; background: #e0e0e0; border-radius: 3px; overflow: hidden;">
                    <div id="progress-bar-fill" style="height: 100%; width: 0%; background: linear-gradient(90deg, #667eea, #764ba2); transition: width 0.3s ease;"></div>
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
            content.style.cssText = 'padding: 16px; display: block;';
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
                progressBarFill: p.querySelector('#progress-bar-fill'),
                btnSettings: p.querySelector('#btn-settings'),
                btnStart: p.querySelector('#btn-start'),
                btnReset: p.querySelector('#btn-reset'),
                toggleBtn: p.querySelector('#elegant-toggle'),
                ctrlAutoNext: p.querySelector('#ctrl-auto-next'),
                sliders: p.querySelectorAll('.adv-slider'),
                targetBtns: p.querySelectorAll('.target-btn')
            };
        }

        bindEvents() {
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

            if (this.elements.btnSettings) {
                this.elements.btnSettings.onclick = () => this.showSettingsModal();
            }
            if (this.elements.btnStart) {
                this.elements.btnStart.onclick = () => {
                    if (this._engine && typeof this._engine.start === 'function') {
                        this._engine.start();
                    } else if (window.MasterEngine && window.MasterEngine.start) {
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

            const ctrlAutoNext = this.elements.ctrlAutoNext;
            if (ctrlAutoNext) {
                ctrlAutoNext.checked = this.config.get('autoNext.enabled', true);
                ctrlAutoNext.onchange = (e) => {
                    this.config.set('autoNext.enabled', e.target.checked);
                };
            }

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

            this._initDrag();
        }

        _initDrag() {
            const header = this.panel?.querySelector('div');
            if (!header || !this.panel) return;

            let isDragging = false;
            let startX, startY, startLeft, startTop;

            const onMouseDown = (e) => {
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const rect = this.panel.getBoundingClientRect();
                startLeft = rect.left;
                startTop = rect.top;
                e.preventDefault();
            };

            const onMouseMove = (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                this.panel.style.left = (startLeft + dx) + 'px';
                this.panel.style.top = (startTop + dy) + 'px';
                this.panel.style.right = 'auto';
            };

            const onMouseUp = () => { isDragging = false; };

            header.addEventListener('mousedown', onMouseDown);
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }

        syncUI() {
            if (this.elements.ctrlAutoNext) {
                this.elements.ctrlAutoNext.checked = this.config.get('autoNext.enabled', true);
            }

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

            const intervalSlider = this.panel.querySelector('.adv-slider[data-key="speed.reportInterval"]');
            if (intervalSlider) {
                intervalSlider.value = this.config.get('speed.reportInterval', 2000);
                const valSpan = intervalSlider.parentNode.querySelector('.slider-value');
                if (valSpan) valSpan.textContent = intervalSlider.value;
            }

            const jumpSlider = this.panel.querySelector('.adv-slider[data-key="speed.jumpSize"]');
            if (jumpSlider) {
                jumpSlider.value = this.config.get('speed.jumpSize', 30);
                const valSpan = jumpSlider.parentNode.querySelector('.slider-value');
                if (valSpan) valSpan.textContent = jumpSlider.value;
            }

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
        }

        updateStatus(nodeId, duration, progress, status) {
            if (nodeId) this._lastNodeId = nodeId;
            if (duration) this._lastDuration = duration;
            if (this.elements.statNode && this._lastNodeId) this.elements.statNode.textContent = this._lastNodeId;
            if (this.elements.statDuration && this._lastDuration) this.elements.statDuration.textContent = this._lastDuration + 's';
            if (this.elements.statProgress && progress !== null && progress !== undefined) {
                this.elements.statProgress.textContent = progress + '%';
            }
            if (this.elements.progressBarFill && progress !== null && progress !== undefined) {
                this.elements.progressBarFill.style.width = Math.min(progress, 100) + '%';
            }
            if (this.elements.statStatus && status) {
                this.elements.statStatus.textContent = status;
                const colors = { '运行中': '#4CAF50', '待机': '#2196F3', '错误': '#f44336', '完成': '#FF9800', '暂停': '#FF9800' };
                this.elements.statStatus.style.color = colors[status] || '#333';
            }
        }

        showSettingsModal() {
            const modal = document.createElement('div');
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 2147483647; display: flex; align-items: center; justify-content: center;';

            const content = document.createElement('div');
            content.style.cssText = 'background: white; width: 400px; max-height: 80vh; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);';
            content.innerHTML = `
                <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px;">
                    <div style="font-size: 18px; font-weight: 600;">⚙️ AI验证码配置</div>
                    <div style="font-size: 12px; opacity: 0.8;">OCR.space + Tesseract.js 双引擎</div>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; color: #666; margin-bottom: 6px;">OCR.space API Key</label>
                        <input type="password" id="setting-ocr-key" placeholder="OCR.space API Key" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;" value="${this.config.get('ai.ocrSpaceKey', 'K88766094088957')}">
                        <div style="font-size: 11px; color: #999; margin-top: 4px;">https://ocr.space/OCRAPI - 免费注册</div>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; color: #666; margin-bottom: 6px;">智谱AI API Key (可选)</label>
                        <input type="password" id="setting-api-key" placeholder="输入API Key" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;" value="${this.config.get('ai.apiKey', '')}">
                        <div style="font-size: 11px; color: #999; margin-top: 4px;">https://open.bigmodel.cn - GLM-4V-Flash</div>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="setting-ai-enabled" ${this.config.get('ai.enabled') ? 'checked' : ''} style="margin-right: 8px;">
                            <span style="font-size: 13px;">启用AI识别验证码</span>
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

            const saveBtn = document.getElementById('setting-save');
            const cancelBtn = document.getElementById('setting-cancel');

            if (saveBtn) {
                saveBtn.onclick = () => {
                    this.config.set('ai.ocrSpaceKey', document.getElementById('setting-ocr-key').value.trim());
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
            this.config = configMgr;
            this.ui = ui;
            this.running = false;
            this.studyId = null;
            this.startTime = null;
            this._api = null;
            this._timer = null;
            this.ocrEngine = new OCREngine(configMgr);
            this._lastNodeId = env.nodeId;
            this._lastDuration = env.duration;
        }

        async start() {
            this.running = true;
            this.startTime = Date.now();
            console.log('🌟 优雅大师启动', this.env);

            this.ui.updateStatus(this.env.nodeId, this.env.duration, 0, '运行中');

            const init = await this.api.study(1);
            if (!init.ok) {
                if (init.needCode) {
                    console.warn('⚠️ 需要验证码，尝试自动识别...');
                    const code = await this.checkCaptcha();
                    if (code) {
                        this.api._captchaCode = code;
                        const retryRes = await this.api.study(1, null, code);
                        if (retryRes.ok) {
                            this.studyId = this._extractStudyId(retryRes.data);
                            console.log('✅ 验证码通过！会话:', this.studyId);
                        } else {
                            console.warn('⚠️ 验证码验证失败:', retryRes.error);
                        }
                    }
                } else {
                    console.warn('⚠️ 初始化上报失败，继续执行:', init.error);
                }
            } else {
                this.studyId = this._extractStudyId(init.data);
                console.log('✅ 会话:', this.studyId, '| 原始响应:', JSON.stringify(init.data).substring(0, 300));
            }

            const jumpSize = this.config.get('speed.jumpSize', 30);
            const interval = this.config.get('speed.reportInterval', 2000);
            const targetPercent = this.config.get('completion.targetPercent', 0.95);
            const target = Math.floor(this.env.duration * targetPercent);
            const loops = Math.ceil(target / jumpSize);

            console.log(`⚡ 上报: ${loops}次, 间隔${interval}ms, 跳跃${jumpSize}s, 目标${Math.floor(targetPercent*100)}%`);

            let captchaFailCount = 0;
            const maxCaptchaFails = 5;

            for (let i = 0; i < loops && this.running; i++) {
                const time = (i + 1) * jumpSize;

                const res = await this.api.study(time, this.studyId);
                if (!res.ok) {
                    if (res.needCode) {
                        if (captchaFailCount >= maxCaptchaFails) {
                            console.error(`❌ 验证码连续失败${maxCaptchaFails}次，停止重试`);
                            break;
                        }
                        console.warn(`⚠️ 上报需要验证码 (${captchaFailCount + 1}/${maxCaptchaFails})，尝试自动识别...`);
                        const captchaImg = document.querySelector('#codeImg, img[src*="/service/code"]');
                        if (captchaImg) captchaImg.click();
                        await this.sleep(1500);
                        const code = await this.checkCaptcha();
                        if (code) {
                            this.api._captchaCode = code;
                            const retryRes = await this.api.study(time, this.studyId, code);
                            if (retryRes.ok) {
                                this.studyId = this._extractStudyId(retryRes.data) || this.studyId;
                                console.log('✅ 验证码通过，继续上报');
                                captchaFailCount = 0;
                            } else {
                                console.warn('⚠️ 验证码验证失败:', retryRes.error);
                                captchaFailCount++;
                                i--;
                                await this.sleep(2000);
                            }
                        } else {
                            captchaFailCount++;
                            i--;
                            await this.sleep(3000);
                        }
                        continue;
                    }
                    if (res.error && res.error.includes('学时')) {
                        console.warn('上报失败，回退重试');
                        i--;
                        await this.sleep(3000);
                        continue;
                    }
                } else {
                    captchaFailCount = 0;
                    if (!this.studyId && res.data) {
                        this.studyId = this._extractStudyId(res.data) || this.studyId;
                    }
                }

                const pct = Math.min(Math.floor(time / this.env.duration * 100), 100);
                this.ui.updateStatus(this._lastNodeId, this._lastDuration, pct, '运行中');

                if (i < loops - 1 && this.running) {
                    await this.sleep(interval);
                }
            }

            const finalRes = await this.api.study(this.env.duration, this.studyId);
            if (finalRes.ok && !this.studyId) {
                this.studyId = this._extractStudyId(finalRes.data) || this.studyId;
            }

            const elapsed = (Date.now() - this.startTime) / 1000;
            console.log(`✅ 完成！耗时: ${elapsed.toFixed(1)}秒, 记录: ${this.env.duration}秒`);
            this.ui.updateStatus(this._lastNodeId, this._lastDuration, 100, '完成');

            if (this.config.get('autoNext.enabled', true)) {
                await this.autoNext();
            }

            return true;
        }

        async checkCaptcha() {
            const captchaImg = document.querySelector('#codeImg, img[src*="/service/code"]');
            if (!captchaImg) return null;

            console.log('🔍 发现验证码图片，4x缩放+六路预处理+反色识别中...');
            try {
                const code = await this.ocrEngine.recognize(captchaImg);
                if (code && code.length >= 3) {
                    console.log('✅ 验证码识别结果:', code);

                    const input = document.querySelector('input[placeholder*="验证码"], input[name*="code"], #yzm');
                    if (input) {
                        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                        nativeSetter.call(input, code);
                        input.dispatchEvent(new Event('input', {bubbles: true}));
                        input.dispatchEvent(new Event('change', {bubbles: true}));
                        console.log('✅ 验证码已自动填入:', code);
                    }

                    const playBtn = document.querySelector('.layui-layer-btn0, [class*="layer-btn0"]');
                    if (playBtn) playBtn.click();

                    this._captchaCode = code;
                    return code;
                } else {
                    console.warn('⚠️ 验证码识别结果无效:', code);
                    captchaImg.click();
                    return null;
                }
            } catch (e) {
                console.error('验证码识别失败:', e);
                captchaImg.click();
                return null;
            }
        }

        async autoNext() {
            const delay = this.config.get('autoNext.delay', 2000);
            await this.sleep(delay);
            const nextId = (parseInt(this.env.nodeId) + 1).toString();
            const targetUrl = location.pathname + '?nodeId=' + nextId;
            console.log(`➡️  自动下一节: ${targetUrl}`);
            sessionStorage.setItem('elegant_autostart', '1');
            window.location.assign(targetUrl);
        }

        _extractStudyId(data) {
            if (!data) return null;
            if (typeof data === 'string') return data;
            if (data.studyId) return data.studyId;
            if (data.data) {
                if (typeof data.data === 'string') return data.data;
                if (data.data.studyId) return data.data.studyId;
            }
            if (data.result) {
                if (typeof data.result === 'string') return data.result;
                if (data.result.studyId) return data.result.studyId;
            }
            for (const key of Object.keys(data)) {
                const val = data[key];
                if (typeof val === 'string' && val.length > 10 && val.length < 50) {
                    return val;
                }
            }
            return null;
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
                    _captchaCode: null,
                    async study(time, studyId = null, code = null) {
                        const params = new URLSearchParams();
                        params.append('nodeId', this.nodeId);
                        params.append('studyId', studyId || '0');
                        params.append('studyTime', String(time));
                        const codeToUse = code || this._captchaCode;
                        if (codeToUse) {
                            params.append('code', codeToUse.substring(0, 4));
                            this._captchaCode = null;
                        }
                        try {
                            const res = await fetch(`${location.origin}/user/node/study`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                                    'X-Requested-With': 'XMLHttpRequest',
                                    'Accept': 'application/json, text/javascript, */*; q=0.01'
                                },
                                body: params.toString(),
                                credentials: 'include'
                            });
                            const data = await res.json().catch(() => ({}));
                            if (data.status === false) return { ok: false, error: data.msg || '未知错误', needCode: data.need_code, data };
                            return { ok: true, data };
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
            if (this.running) {
                console.warn('⚠️ 已有实例运行中');
                return false;
            }
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
                this.ui.updateStatus(this.env.nodeId, this.env.duration, 0, '运行中');
                this.bot = new ElegantBot(this.env, this.config, this.ui);
                const success = await this.bot.start();
                return success;
            } catch (e) {
                console.error('❌ 运行错误:', e);
                this.ui.updateStatus(null, null, null, '错误');
                return false;
            } finally {
                this.running = false;
                this.bot = null;
            }
        }

        stop() {
            if (this.bot) { this.bot.stop(); this.bot = null; }
            this.running = false;
        }

        detectEnvironment() {
            const params = new URLSearchParams(location.search);
            const paramNodeId = params.get("nodeId");
            const pathMatch = location.pathname.match(/\/node\/(\d+)/);
            if (!pathMatch && !paramNodeId) return null;
            const nodeId = pathMatch ? pathMatch[1] : paramNodeId;

            let duration = 0;
            const video = document.querySelector("video");
            if (video && video.readyState >= 1 && video.duration && video.duration !== Infinity) {
                duration = Math.floor(video.duration);
            } else {
                const allTexts = Array.from(document.querySelectorAll("*")).map(el => el.textContent).join("\n");
                const matches = allTexts.match(/\b(\d{1,2})\s*[:：]\s*(\d{2})\b/g);
                if (matches) {
                    for (let i = matches.length - 1; i >= 0; i--) {
                        const m = matches[i].match(/(\d{1,2})\s*[:：]\s*(\d{2})/);
                        if (m) {
                            const min = parseInt(m[1]), sec = parseInt(m[2]);
                            if (min > 0 || sec > 0) { duration = min * 60 + sec; break; }
                        }
                    }
                }
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
        console.log(`🌟 优雅大师 ${ELEGANT_VERSION} 初始化中...`);
        await new Promise(resolve => {
            if (document.readyState === 'complete') resolve();
            else window.addEventListener('load', resolve);
        });
        await new Promise(resolve => setTimeout(resolve, 500));

        const configMgr = new ConfigManager();
        const ui = new UIBuilder(configMgr);
        const engine = new MasterController(configMgr, ui);

        ui.setEngine(engine);
        ui.create();

        window.MasterEngine = engine;
        window.ElegantConfig = configMgr;

        const env = engine.detectEnvironment();
        if (env) {
            ui.updateStatus(env.nodeId, env.duration, 0, '待机');
            const autoNextEnabled = configMgr.get('autoNext.enabled', false);
            const autoStartFlag = sessionStorage.getItem('elegant_autostart');
            if (autoNextEnabled && autoStartFlag === '1') {
                sessionStorage.removeItem('elegant_autostart');
                console.log('🔄 自动续刷模式，2秒后启动...');
                setTimeout(() => engine.start(), 2000);
            } else {
                console.log('🌟 优雅大师已就绪，点击"🚀 启动"开始');
            }
        } else {
            console.log('⚠️  未检测到学习节点，请先访问课程页面');
        }

        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                console.log('🔄 URL 变化，重新检测环境:', location.href);
                let attempts = 0;
                const maxAttempts = 30;
                const tryDetect = () => {
                    const newEnv = engine.detectEnvironment();
                    if (newEnv) {
                        engine.env = newEnv;
                        ui.updateStatus(newEnv.nodeId, newEnv.duration, 0, '待机');
                        console.log('✅ 环境已更新:', newEnv);
                        const autoNextEnabled = engine.config.get('autoNext.enabled');
                        if (autoNextEnabled) {
                            console.log('➡️ 自动下一节: 重新启动刷课');
                            setTimeout(() => engine.start(), 1500);
                        }
                    } else if (++attempts < maxAttempts) {
                        setTimeout(tryDetect, 300);
                    } else {
                        console.log('⚠️  环境检测超时（非学习节点页面）');
                    }
                };
                tryDetect();
            }
        }, 500);
    }

    init();

})();
