
(function() {

if (window.__ELEGANT_MASTER_LOADED__ && !window.__ELEGANT_MASTER_HOTRELOAD__) {
    console.warn('[优雅大师] 检测到已运行的实例，跳过重复初始化');
    return;
}
window.__ELEGANT_MASTER_LOADED__ = true;
window.__ELEGANT_MASTER_HOTRELOAD__ = false;

const ELEGANT_VERSION = 'v3.4-planH-v2';

const _HOTRELOAD_PORT = 18923;
const _HOTRELOAD_URL = `http://localhost:${_HOTRELOAD_PORT}/elegant-master-study.user.js`;
const _TUTORIAL_BASE_URL = 'https://scauzj.leykeji.com/tutorial';

async function checkAndHotReload() {
    if (window.__ELEGANT_MASTER_HOTRELOAD__) return false;
    
    const _IS_DEV_VERSION = (document.currentScript && document.currentScript.src && document.currentScript.src.includes('localhost:' + _HOTRELOAD_PORT));
    if (_IS_DEV_VERSION) {
        console.log('[HotReload] ✅ 已是开发版本，跳过热重载检测');
        return false;
    }
    
    if ((window.__ELEGANT_MASTER_HR_COUNT || 0) >= 1) {
        console.log('[HotReload] ⚠️ 已触发过热重载，防止循环');
        return false;
    }
    
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 2000);
        const res = await fetch(_HOTRELOAD_URL + '?t=' + Date.now(), { 
            method: 'HEAD', mode: 'no-cors', signal: ctrl.signal 
        });
        clearTimeout(timer);
        console.log(`[HotReload] 🔄 检测到开发服务器(端口${_HOTRELOAD_PORT})，自动加载最新版本...`);
        window.__ELEGANT_MASTER_HR_COUNT = (window.__ELEGANT_MASTER_HR_COUNT || 0) + 1;
        window.__ELEGANT_MASTER_HOTRELOAD__ = true;
        window.__ELEGANT_MASTER_LOADED__ = false;
        const s = document.createElement('script');
        s.src = _HOTRELOAD_URL + '?t=' + Date.now();
        s.onload = () => console.log('[HotReload] ✅ 开发版加载完成');
        s.onerror = () => console.error('[HotReload] ❌ 开发版加载失败，使用当前版本');
        document.head.appendChild(s);
        return true;
    } catch(e) {
        return false;
    }
}

let _hotreloadPending = checkAndHotReload();

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
        ai: { enabled: true, apiKey: '', maxPerSession: 10, ocrSpaceKey: 'REDACTED_OCRSPACE_KEY' },
        autoNext: { enabled: true, delay: 2000 },
        completion: { targetPercent: 0.95, realPlayPercent: 0.3, maxRealPlayWait: 180 },
        antiCheat: { randomJitter: 300 },
        ocr: {
            baidu: { apiKey: 'REDACTED_BAIDU_APIKEY', secretKey: 'REDACTED_BAIDU_SECRETKEY' },
            tencent: { secretId: '', secretKey: '' }
        }
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

    // ==================== OCR 基础设施层 ====================
    
    class ImagePreprocessor {
        constructor() {
            this.THRESHOLDS = [80, 100, 120, 140, 160];
            this.SCALE_FACTOR = 4;
        }

        extractScaled(imgElement) {
            const origW = imgElement.naturalWidth || imgElement.width || 90;
            const origH = imgElement.naturalHeight || imgElement.height || 40;
            const newW = origW * this.SCALE_FACTOR;
            const newH = origH * this.SCALE_FACTOR;
            const canvas = document.createElement('canvas');
            canvas.width = newW; canvas.height = newH;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(imgElement, 0, 0, newW, newH);
            return { canvas, origW, origH, newW, newH };
        }

        preprocessGrayscale(sourceCanvas) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = sourceCanvas.width; canvas.height = sourceCanvas.height;
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

        preprocessInvert(sourceCanvas) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = sourceCanvas.width; canvas.height = sourceCanvas.height;
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

        sixWayPreprocess(sourceCanvas) {
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
                    data[i] = data[i+1] = data[i+2] = v; data[i+3] = 255;
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
                tempCanvas.width = w; tempCanvas.height = h;
                tempCanvas.getContext('2d').putImageData(imageData, 0, 0);
                results.push({ threshold, base64: tempCanvas.toDataURL('image/png').split(',')[1] });
            }

            const invertedBinCanvas = document.createElement('canvas');
            invertedBinCanvas.width = w; invertedBinCanvas.height = h;
            const invCtx = invertedBinCanvas.getContext('2d');
            invCtx.drawImage(sourceCanvas, 0, 0);
            const invData = invCtx.getImageData(0, 0, w, h);
            const invPixels = invData.data;
            for (let i = 0; i < invPixels.length; i += 4) {
                const gray = 0.299 * invPixels[i] + 0.587 * invPixels[i+1] + 0.114 * invPixels[i+2];
                const v = gray < 120 ? 255 : 0;
                invPixels[i] = invPixels[i+1] = invPixels[i+2] = v; invPixels[i+3] = 255;
            }
            invCtx.putImageData(invData, 0, 0);
            results.push({ threshold: 'inv', base64: invertedBinCanvas.toDataURL('image/png').split(',')[1] });

            return results;
        }

        cleanText(text) {
            if (!text) return "";
            return text.replace(/[\s\n\r]/g, '').trim();
        }
    }

    class NetworkClient {
        gmFetch(url, options = {}) {
            return new Promise((resolve, reject) => {
                if (typeof _GM_xmlhttpRequest === 'function') {
                    console.log('[NetworkClient] 使用 GM_xmlhttpRequest');
                    _GM_xmlhttpRequest({
                        method: options.method || 'GET',
                        url: url,
                        headers: options.headers || {},
                        data: options.body || undefined,
                        onload: (res) => resolve(res.responseText),
                        onerror: (err) => reject(new Error('GM请求失败: ' + (err.error || err.message || '未知'))),
                        ontimeout: () => reject(new Error('GM请求超时')),
                        timeout: options.timeout || 30000
                    });
                } else {
                    console.log('[NetworkClient] GM_xmlhttpRequest不可用，降级使用fetch');
                    fetch(url, {
                        method: options.method || 'GET',
                        headers: options.headers || {},
                        body: options.body || undefined,
                    })
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        return response.text();
                    })
                    .then(text => resolve(text))
                    .catch(err => reject(new Error(`Fetch降级失败: ${err.message}`)));
                }
            });
        }

        async fetch(url, options = {}) {
            try {
                const response = await fetch(url, options);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return await response.json();
            } catch (error) {
                throw new Error(`Fetch请求失败: ${error.message}`);
            }
        }
    }

    class ScriptLoader {
        constructor() {
            this.loadedScripts = new Set();
        }

        async loadScript(url, name) {
            if (this.loadedScripts.has(url)) {
                console.log(`[ScriptLoader] ${name} 已加载，跳过`);
                return;
            }
            
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.onload = () => {
                    console.log(`[ScriptLoader] ${name} 加载成功`);
                    this.loadedScripts.add(url);
                    resolve();
                };
                script.onerror = () => reject(new Error(`${name} 加载失败`));
                document.head.appendChild(script);
            });
        }

        isGlobalAvailable(globalName) {
            return typeof window[globalName] !== 'undefined';
        }
    }

    class OCREngineBackend {
        async recognize(context) {
            throw new Error('子类必须实现recognize方法');
        }

        isEnabled() {
            throw new Error('子类必须实现isEnabled方法');
        }

        getName() {
            throw new Error('子类必须实现getName方法');
        }
    }

    class OcrSpaceBackend extends OCREngineBackend {
        constructor(config, networkClient) {
            super();
            this.config = config;
            this.networkClient = networkClient;
        }

        getName() { return 'ocrspace'; }

        isEnabled() { return !!this.config.ocrspace.apiKey; }

        async recognize(context) {
            const apiKey = this.config.ocrspace.apiKey;
            console.log(`[OCR.space] 🚀 启动多变体识别 (key: ${apiKey.substring(0, 6)}...)`);
            
            const candidates = [];
            const variants = [
                { b64: context.base64Raw, label: '原图' },
                { b64: context.base64Grayscale, label: '灰度' },
                { b64: context.base64Inverted, label: '反色' },
            ];

            for (const variant of variants) {
                if (!variant.b64) continue;
                try {
                    const fullDataUrl = 'data:image/png;base64,' + variant.b64;
                    const res = await this.networkClient.gmFetch(this.config.ocrspace.endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `apikey=${encodeURIComponent(apiKey)}&language=eng&isOverlayRequired=false&base64Image=${encodeURIComponent(fullDataUrl)}`,
                        timeout: 30000
                    });
                    
                    const obj = JSON.parse(res);
                    if (obj.IsErrored || !obj.ParsedResults?.[0]) continue;
                    
                    const text = (obj.ParsedResults[0].ParsedText || '').replace(/[^a-zA-Z0-9]/g, '');
                    if (text && text.length >= 3 && text.length <= 6) {
                        console.log(`[OCR.space] ✅ ${variant.label}: "${text}"`);
                        candidates.push({ text, label: variant.label });
                        if (candidates.length >= 2) break;
                    }
                } catch (e) {
                    console.warn(`[OCR.space] ⚠️ ${variant.label} 失败: ${e.message}`);
                }
            }

            if (candidates.length === 0) throw new Error('所有变体均无效');

            const voteMap = {};
            candidates.forEach(c => {
                voteMap[c.text] = (voteMap[c.text] || 0) + 1;
            });
            
            let bestText = candidates[0].text;
            let maxVotes = 1;
            for (const [text, votes] of Object.entries(voteMap)) {
                if (votes > maxVotes) {
                    bestText = text;
                    maxVotes = votes;
                }
            }

            console.log(`[OCR.space] 🏆 投票结果: "${bestText}" (${maxVotes}/${candidates.length}票, 共${candidates.length}个候选)`);
            return bestText;
        }
    }

    class BaiduOcrBackend extends OCREngineBackend {
        constructor(config, networkClient) {
            super();
            this.config = config;
            this.networkClient = networkClient;
            this.tokenCache = null;
            this.tokenExpire = 0;
        }

        getName() { return 'baidu'; }

        isEnabled() { return !!(this.config.baidu.apiKey && this.config.baidu.secretKey); }

        async recognize(context) {
            const token = await this.getAccessToken();
            const candidates = [];

            const tryImage = async (b64, label) => {
                const result = await this.baiduRequest(token, b64);
                if (result) {
                    const cleaned = result.replace(/[^a-zA-Z0-9]/g, '');
                    if (cleaned.length >= 3 && cleaned.length <= 6) {
                        console.log(`[百度] ${label}: ${cleaned}`);
                        candidates.push(cleaned);
                    }
                }
                return result;
            };

            await tryImage(context.base64Raw, '原图');
            if (candidates.length === 0 && context.base64Grayscale) {
                await new Promise(r => setTimeout(r, 500));
                await tryImage(context.base64Grayscale, '灰度');
            }

            if (candidates.length === 0) return null;
            if (candidates.length === 1) return candidates[0];
            
            const freq = {};
            for (const c of candidates) freq[c] = (freq[c] || 0) + 1;
            let best = '', bestCount = 0;
            for (const [text, count] of Object.entries(freq)) {
                if (count > bestCount) { best = text; bestCount = count; }
            }
            console.log(`[百度] 多数投票: ${best} (${bestCount}/${candidates.length})`);
            return bestCount >= 2 ? best : candidates[0];
        }

        async getAccessToken() {
            if (this.tokenCache && Date.now() < this.tokenExpire) return this.tokenCache;
            const cfg = this.config.baidu;
            const url = 'https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=' +
                encodeURIComponent(cfg.apiKey) + '&client_secret=' + encodeURIComponent(cfg.secretKey);

            const res = await this.networkClient.gmFetch(url, { method: 'GET' });
            const obj = JSON.parse(res);
            if (obj.error) throw new Error('百度token错误: ' + (obj.error_description || obj.error));
            this.tokenCache = obj.access_token;
            this.tokenExpire = Date.now() + (obj.expires_in - 300) * 1000;
            console.log(`[百度] ✅ token获取成功, 有效期${Math.floor((obj.expires_in - 300) / 60)}分钟`);
            return this.tokenCache;
        }

        async baiduRequest(token, base64) {
            const params = new URLSearchParams();
            params.set('image', base64);
            const cfg = this.config.baidu;
            const res = await this.networkClient.gmFetch(cfg.endpoint + '?access_token=' + encodeURIComponent(token), {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            });
            const obj = JSON.parse(res);
            console.log(`[百度] API响应: error_code=${obj.error_code || 'none'}, words_count=${(obj.words_result||[]).length}, raw=${res.substring(0, 200)}`);
            if (obj.error_code) throw new Error(`百度OCR错误${obj.error_code}: ${obj.error_msg || ''}`);
            const words = obj.words_result || [];
            return words.map(w => w.words).join('');
        }
    }

    class TencentOcrBackend extends OCREngineBackend {
        constructor(config, networkClient) {
            super();
            this.config = config;
            this.networkClient = networkClient;
        }

        getName() { return 'tencent'; }

        isEnabled() { return !!(this.config.tencent.secretId && this.config.tencent.secretKey); }

        async recognize(context) {
            const cfg = this.config.tencent;
            const action = 'GeneralBasicOCR';
            const version = '2018-11-19';
            const timestamp = Math.floor(Date.now() / 1000);
            const payload = { ImageBase64: context.base64Raw };
            const body = JSON.stringify({ Action: action, Version: version, Region: cfg.region, ...payload });

            const authorization = this.tc3Sign(cfg.secretId, cfg.secretKey, 'ocr.tencentcloudapi.com', timestamp, body);
            const res = await this.networkClient.gmFetch(cfg.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-TC-Action': action,
                    'X-TC-Version': version,
                    'X-TC-Timestamp': String(timestamp),
                    'X-TC-Region': cfg.region,
                    'Authorization': authorization
                },
                body: body
            });

            const obj = JSON.parse(res);
            if (obj.Response?.Error) throw new Error(`腾讯云错误: ${obj.Response.Error.Message}`);
            const list = obj.Response?.TextDetections || [];
            return list.map(d => d.DetectedText).join('');
        }

        tc3Sign(secretId, secretKey, service, timestamp, body) {
            const algorithm = 'TC3-HMAC-SHA256';
            const date = new Date(timestamp * 1000).toISOString().slice(0, 10).replace(/-/g, '');
            const credentialScope = `${date}/${service}/tc3_request`;

            const httpRequestMethod = 'POST';
            const canonicalUri = '/';
            const canonicalQuerystring = '';
            const canonicalHeaders = 'content-type:application/json\nhost:' + service + '\nx-tc-action:GeneralBasicOCR\nx-tc-region:ap-guangzhou\nx-tc-timestamp:' + timestamp + '\nx-tc-version:2018-11-19\n';
            const signedHeaders = 'content-type;host;x-tc-action;x-tc-region;x-tc-timestamp;x-tc-version';

            const canonicalReq = httpRequestMethod + '\n' + canonicalUri + '\n' + canonicalQuerystring + '\n' +
                canonicalHeaders + '\n' + signedHeaders + '\n' + this.sha256Hex(body);

            const stringToSign = algorithm + '\n' + timestamp + '\n' + credentialScope + '\n' + this.sha256Hex(canonicalReq);

            const secretDate = this.hmacSha256('TC3' + secretKey, date);
            const secretService = this.hmacSha256(secretDate, service);
            const secretSigning = this.hmacSha256(secretService, 'tc3_request');
            const signature = this.hex(this.hmacSha256(secretSigning, stringToSign));

            return algorithm + ' Credential=' + secretId + '/' + credentialScope +
                ', SignedHeaders=' + signedHeaders + ', Signature=' + signature;
        }

        sha256Hex(message) { return this.hex(new TextEncoder().encode(message)); }

        hex(buffer) { return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join(''); }

        async hmacSha256(key, message) {
            const cryptoKey = await crypto.subtle.importKey(
                'raw', typeof key === 'string' ? new TextEncoder().encode(key) : key,
                { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
            );
            return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message)));
        }
    }

    class PuterBackend extends OCREngineBackend {
        constructor(config, scriptLoader) {
            super();
            this.config = config;
            this.scriptLoader = scriptLoader;
        }

        getName() { return 'puter'; }

        isEnabled() { return this.config.puter.enabled; }

        async recognize(context) {
            if (!this.scriptLoader.isGlobalAvailable('puter')) {
                console.log('[Puter] 加载 Puter.js...');
                await this.scriptLoader.loadScript('https://js.puter.com/v2/', 'Puter.js');
            }
            if (!this.scriptLoader.isGlobalAvailable('puter') || !puter.ai || !puter.ai.img2txt) {
                throw new Error('Puter.js 未加载或不可用');
            }

            console.log('[Puter] 🚀 启动多变体识别...');
            
            const candidates = [];
            
            const tryRecognize = async (dataUrl, label) => {
                try {
                    const text = await Promise.race([
                        puter.ai.img2txt(dataUrl),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Puter OCR 超时(15s)')), 15000))
                    ]);
                    if (!text || typeof text !== 'string') return null;
                    
                    let cleaned = text
                        .replace(/[\r\n]+/g, '')
                        .replace(/\s+/g, '')
                        .replace(/[^a-zA-Z0-9]/g, '');
                    
                    if (cleaned.length > 4 && cleaned.substring(0, cleaned.length/2) === cleaned.substring(cleaned.length/2)) {
                        cleaned = cleaned.substring(0, cleaned.length/2);
                    }
                    
                    if (cleaned && cleaned.length >= 3 && cleaned.length <= 6) {
                        console.log(`[Puter] ✅ ${label}: "${cleaned}"`);
                        return { text: cleaned, label };
                    }
                    console.log(`[Puter] ⚠️ ${label}: "${cleaned}" (长度无效)`);
                    return null;
                } catch (e) {
                    console.warn(`[Puter] ⚠️ ${label} 失败: ${e.message}`);
                    return null;
                }
            };

            let result = await tryRecognize(context.dataUrl, '原图');
            if (result) candidates.push(result);

            result = await tryRecognize('data:image/png;base64,' + context.base64Grayscale, '灰度');
            if (result) candidates.push(result);

            result = await tryRecognize('data:image/png;base64,' + context.base64Inverted, '反色');
            if (result) candidates.push(result);

            for (let i = 0; i < context.sixWayImages.length; i++) {
                result = await tryRecognize(
                    'data:image/png;base64,' + context.sixWayImages[i].base64,
                    `二值化${i+1}(T=${context.sixWayImages[i].threshold})`
                );
                if (result) candidates.push(result);
            }

            if (candidates.length === 0) throw new Error('所有变体均无效');

            const voteMap = {};
            candidates.forEach(c => {
                voteMap[c.text] = (voteMap[c.text] || 0) + 1;
            });
            
            let bestText = candidates[0].text;
            let maxVotes = 1;
            for (const [text, votes] of Object.entries(voteMap)) {
                if (votes > maxVotes) {
                    bestText = text;
                    maxVotes = votes;
                }
            }

            console.log(`[Puter] 🏆 投票结果: "${bestText}" (${maxVotes}/${candidates.length}票, 共${candidates.length}个候选)`);
            return bestText;
        }
    }

    class TesseractBackend extends OCREngineBackend {
        constructor(config, scriptLoader) {
            super();
            this.config = config;
            this.scriptLoader = scriptLoader;
        }

        getName() { return 'tesseract'; }

        isEnabled() { return true; }

        async recognize(context) {
            try {
                if (!this.scriptLoader.isGlobalAvailable('Tesseract')) {
                    console.log('[Tesseract] 加载 Tesseract.js...');
                    await this.scriptLoader.loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', 'Tesseract.js');
                }
                if (!this.scriptLoader.isGlobalAvailable('Tesseract')) throw new Error("Tesseract.js 加载失败");

                console.log('[Tesseract] 创建 Worker...');
                const worker = await Tesseract.createWorker('eng');
                console.log('[Tesseract] Worker 已创建，开始识别原图...');
                const ret = await worker.recognize(context.scaled.canvas);
                await worker.terminate();

                const grayCanvas = document.createElement('canvas');
                grayCanvas.width = context.scaled.canvas.width;
                grayCanvas.height = context.scaled.canvas.height;
                const gCtx = grayCanvas.getContext('2d');
                gCtx.drawImage(context.scaled.canvas, 0, 0);
                const gData = gCtx.getImageData(0, 0, grayCanvas.width, grayCanvas.height);
                const gPixels = gData.data;
                for (let i = 0; i < gPixels.length; i += 4) {
                    const gray = 0.299 * gPixels[i] + 0.587 * gPixels[i+1] + 0.114 * gPixels[i+2];
                    const v = gray > 128 ? 255 : 0;
                    gPixels[i] = gPixels[i+1] = gPixels[i+2] = v;
                }
                gCtx.putImageData(gData, 0, 0);

                console.log('[Tesseract] 创建第二个 Worker（二值化图像）...');
                const worker2 = await Tesseract.createWorker('eng');
                const ret2 = await worker2.recognize(grayCanvas);
                await worker2.terminate();

                const text1 = (ret.data.text || '').replace(/[^a-zA-Z0-9]/g, '');
                const text2 = (ret2.data.text || '').replace(/[^a-zA-Z0-9]/g, '');
                console.log(`[Tesseract] 原图: "${text1}", 二值化: "${text2}"`);

                if (text1 === text2 && text1.length >= 3) return text1;
                if (text2.length >= 3 && text2.length <= 6) return text2;
                if (text1.length >= 3 && text1.length <= 6) return text1;

                const result = text2 || text1;
                if (result && result.length >= 2) return result;
                
                console.warn('[Tesseract] 识别结果过短或为空');
                throw new Error('Tesseract识别结果无效');
            } catch (error) {
                console.error('[Tesseract] 识别失败:', error.message);
                throw error;
            }
        }
    }

    class Glm4VBackend extends OCREngineBackend {
        constructor(config, networkClient) {
            super();
            this.config = config;
            this.networkClient = networkClient;
        }

        getName() { return 'glm4v'; }

        isEnabled() { return !!this.config.glm4v.apiKey; }

        async recognize(context) {
            const apiKey = this.config.glm4v.apiKey;
            if (!apiKey) throw new Error('GLM-4V-Flash 未配置API Key');

            console.log('[GLM-4V] 调用视觉模型识别验证码...');
            const data = await this.networkClient.fetch(this.config.glm4v.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify({
                    model: 'glm-4v-flash',
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: '请只输出这张验证码图片中的字母和数字字符，不要包含任何其他文字、标点符号或解释。如果看不清就输出最可能的4个字符。' },
                            { type: 'image_url', image_url: { url: context.dataUrl } }
                        ]
                    }],
                    max_tokens: 20,
                    temperature: 0.1
                })
            });

            const text = data.choices?.[0]?.message?.content?.trim() || '';
            console.log(`[GLM-4V] 原始返回: "${text}"`);
            return text.replace(/[^a-zA-Z0-9]/g, '');
        }
    }

    // ==================== OCR 六级全自动降级引擎 v3.2 (重构版) ====================
    // 红队原则: 全流程自主，无需人工干预
    // 降级链: OCR.space → 百度OCR → 腾讯云OCR → Puter.js(无Key云) → Tesseract.js(本地) → GLM-4V-Flash(视觉模型)
    // 架构改进: 策略模式 + 单一职责原则
    class OCREngine {
        constructor(configMgr) {
            this.config = configMgr;
            this.maxRetries = 8;

            this.imagePreprocessor = new ImagePreprocessor();
            this.networkClient = new NetworkClient();
            this.scriptLoader = new ScriptLoader();

            const _emptyCfg = { ocrspace:{apiKey:'',endpoint:''}, baidu:{apiKey:'',secretKey:'',endpoint:''}, tencent:{secretId:'',secretKey:'',endpoint:'',region:''}, puter:{enabled:true}, glm4v:{apiKey:'',endpoint:''} };
            this.backends = [
                new OcrSpaceBackend(_emptyCfg, this.networkClient),
                new BaiduOcrBackend(_emptyCfg, this.networkClient),
                new TencentOcrBackend(_emptyCfg, this.networkClient),
                new PuterBackend(_emptyCfg, this.scriptLoader),
                new TesseractBackend(_emptyCfg, this.scriptLoader),
                new Glm4VBackend(_emptyCfg, this.networkClient)
            ];
        }

        _buildConfig() {
            return {
                ocrspace: {
                    apiKey: this.config.get('ai.ocrSpaceKey', ''),
                    endpoint: 'https://api.ocr.space/parse/image'
                },
                baidu: {
                    apiKey: this.config.get('ocr.baidu.apiKey', ''),
                    secretKey: this.config.get('ocr.baidu.secretKey', ''),
                    endpoint: 'https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic'
                },
                tencent: {
                    secretId: this.config.get('ocr.tencent.secretId', ''),
                    secretKey: this.config.get('ocr.tencent.secretKey', ''),
                    endpoint: 'https://ocr.tencentcloudapi.com',
                    region: 'ap-guangzhou'
                },
                puter: { enabled: this.config.get('ocr.puter.enabled', true) },
                glm4v: {
                    apiKey: this.config.get('ai.apiKey', ''),
                    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
                }
            };
        }

        _refreshBackends() {
            const freshCfg = this._buildConfig();
            for (const b of this.backends) b.config = freshCfg;
        }

        async solveWithRetry(getCaptchaImg, fillInput, submitLogin) {
            for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
                console.log(`🔍 [v3.2] 验证码识别尝试 ${attempt}/${this.maxRetries}`);
                const imgElement = getCaptchaImg();
                if (!imgElement) { console.warn('⚠️ 未找到验证码图片'); continue; }

                try {
                    const code = await this.recognize(imgElement);
                    if (code && code.length >= 3) {
                        console.log(`✅ [v3.2] 识别成功: ${code} (第${attempt}次尝试)`);
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
            console.error(`❌ [v3.2] ${this.maxRetries}次尝试均失败（六级降级链耗尽）`);
            return false;
        }

        async recognize(imgElement) {
            if (!imgElement) throw new Error("未找到图片元素");
            console.log("[OCR v3.2] 🚀 启动六级全自动降级链...");

            const scaled = this.imagePreprocessor.extractScaled(imgElement);
            const base64Raw = scaled.canvas.toDataURL('image/png').split(',')[1];
            const base64Grayscale = this.imagePreprocessor.preprocessGrayscale(scaled.canvas);
            const base64Inverted = this.imagePreprocessor.preprocessInvert(scaled.canvas);
            const sixWayImages = this.imagePreprocessor.sixWayPreprocess(scaled.canvas);
            const dataUrl = scaled.canvas.toDataURL('image/png');
            console.log(`[OCR v3.2] 预处理完成: ${scaled.origW}x${scaled.origH} → ${scaled.newW}x${scaled.newH}, ${sixWayImages.length + 2}张变体`);

            const context = {
                imgElement,
                scaled,
                base64Raw,
                base64Grayscale,
                base64Inverted,
                sixWayImages,
                dataUrl
            };

            this._refreshBackends();

            for (const backend of this.backends) {
                if (!backend.isEnabled()) {
                    console.log(`[OCR v3.2] ⏭️ ${backend.getName()}: 未配置，跳过`);
                    continue;
                }
                try {
                    console.log(`[OCR v3.2] 🔄 尝试 [${backend.getName()}]...`);
                    const text = await backend.recognize(context);
                    if (text && text.length >= 3 && text.length <= 6) {
                        const cleaned = this.imagePreprocessor.cleanText(text);
                        console.log(`[OCR v3.2] ✅ [${backend.getName()}] 成功: "${cleaned}"`);
                        return cleaned;
                    }
                    console.warn(`[OCR v3.2] ⚠️ [${backend.getName()}] 结果无效: "${text}"`);
                } catch (e) {
                    console.warn(`[OCR v3.2] ❌ [${backend.getName()}] 失败: ${e.message}`);
                }
            }

            throw new Error("[OCR v3.2] 所有六级后端均失败");
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
            const allPanels = document.querySelectorAll('#elegant-master-panel');
            if (allPanels.length > 0) {
                console.log(`[UI] 检测到 ${allPanels.length} 个旧UI实例，全部销毁...`);
                allPanels.forEach(p => p.remove());
            }

            const otherElements = document.querySelectorAll('[id^="elegant-master"]:not(#elegant-master-panel)');
            otherElements.forEach(p => {
                console.log(`[UI] 销毁残留: ${p.id}`);
                p.remove();
            });

            this.panel = document.createElement('div');
            this.panel.id = 'elegant-master-panel';
            this.panel.style.cssText = `
                position: fixed; top: 20px; left: 20px; width: 320px; max-height: 90vh;
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
                        <button class="speed-btn" data-mode="slow" style="flex: 1; padding: 8px; background: #e0e0e0; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">🐢 稳健</button>
                        <button class="speed-btn" data-mode="normal" style="flex: 1; padding: 8px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">⚡ Plan H</button>
                        <button class="speed-btn" data-mode="fast" style="flex: 1; padding: 8px; background: #e0e0e0; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">🚀 激进</button>
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
                    if (this.elements.contentWrapper) this.elements.contentWrapper.display = expanded ? 'block' : 'none';
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

            const nodeEl = this.elements.statNode || document.getElementById('stat-node');
            const durEl = this.elements.statDuration || document.getElementById('stat-duration');
            const progEl = this.elements.statProgress || document.getElementById('stat-progress');
            const statusEl = this.elements.statStatus || document.getElementById('stat-status');
            const barEl = this.elements.progressBarFill || document.getElementById('progress-bar-fill');

            if (nodeEl && this._lastNodeId) nodeEl.textContent = this._lastNodeId;
            if (durEl && this._lastDuration) durEl.textContent = this._lastDuration + 's';
            if (progEl && progress !== null && progress !== undefined) {
                progEl.textContent = Math.round(progress) + '%';
            }
            if (barEl && progress !== null && progress !== undefined) {
                barEl.style.width = Math.min(progress, 100) + '%';
            }
            if (statusEl && status) {
                statusEl.textContent = status;
                const colors = { '运行中': '#4CAF50', '待机': '#2196F3', '错误': '#f44336', '完成': '#FF9800', '暂停': '#FF9800' };
                statusEl.style.color = colors[status] || '#333';
            }

            if (!this.elements.statNode && nodeEl) this.elements.statNode = nodeEl;
            if (!this.elements.statDuration && durEl) this.elements.statDuration = durEl;
        }

        showSettingsModal() {
            const modal = document.createElement('div');
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 2147483647; display: flex; align-items: center; justify-content: center;';

            const content = document.createElement('div');
            content.style.cssText = 'background: white; width: 460px; max-height: 85vh; border-radius: 16px; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);';
            content.innerHTML = `
                <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; position: sticky; top: 0;">
                    <div style="font-size: 18px; font-weight: 600;">⚙️ OCR 全自动配置 v3.1</div>
                    <div style="font-size: 12px; opacity: 0.8;">六级降级链 · 红队全自动模式</div>
                </div>
                <div style="padding: 20px;">

                    <div style="background: #e8f5e9; border-radius: 10px; padding: 14px; margin-bottom: 16px; border-left: 4px solid #4CAF50;">
                        <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">🥇 OCR.space (首选 · 25,000次/月免费)</div>
                        <input type="text" id="set-ocrspace-key" placeholder="OCR.space API Key" value="${this.config.get('ai.ocrSpaceKey', '')}" style="width:100%;padding:7px;border:1px solid #ddd;border-radius:5px;font-size:12px;margin-bottom:4px;box-sizing:border-box;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-size: 10px; color: #666;">无需实名，只需邮箱注册</span>
                            <a href="https://ocr.space/ocrapi/freekey" target="_blank" style="font-size:10px;color:#4CAF50;text-decoration:none;">📖 查看教程 →</a>
                        </div>
                    </div>

                    <div style="background: #f8f9fa; border-radius: 10px; padding: 14px; margin-bottom: 16px; border-left: 4px solid #667eea;">
                        <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">🥈 百度 OCR (1,000次/月免费)</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <div>
                                <label style="font-size: 11px; color: #666;">API Key</label>
                                <input type="text" id="set-baidu-apikey" placeholder="百度云 API Key" value="${this.config.get('ocr.baidu.apiKey', '')}" style="width:100%;padding:7px;border:1px solid #ddd;border-radius:5px;font-size:12px;box-sizing:border-box;">
                            </div>
                            <div>
                                <label style="font-size: 11px; color: #666;">Secret Key</label>
                                <input type="password" id="set-baidu-secretkey" placeholder="Secret Key" value="${this.config.get('ocr.baidu.secretKey', '')}" style="width:100%;padding:7px;border:1px solid #ddd;border-radius:5px;font-size:12px;box-sizing:border-box;">
                            </div>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                            <span style="font-size: 10px; color: #999;">需要手机号+身份证实名</span>
                            <a href="#" onclick="window.open(_TUTORIAL_BASE_URL+'/baidu-ocr-apikey-tutorial','_blank');return false;" style="font-size:10px;color:#667eea;text-decoration:none;">📖 查看教程 →</a>
                        </div>
                    </div>

                    <div style="background: #f8f9fa; border-radius: 10px; padding: 14px; margin-bottom: 16px; border-left: 4px solid #00a4ff;">
                        <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">🥉 腾讯云 OCR (1,000次/月免费)</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <div>
                                <label style="font-size: 11px; color: #666;">SecretId</label>
                                <input type="text" id="set-tencent-secretid" placeholder="腾讯云 SecretId" value="${this.config.get('ocr.tencent.secretId', '')}" style="width:100%;padding:7px;border:1px solid #ddd;border-radius:5px;font-size:12px;box-sizing:border-box;">
                            </div>
                            <div>
                                <label style="font-size: 11px; color: #666;">SecretKey</label>
                                <input type="password" id="set-tencent-secretkey" placeholder="SecretKey" value="${this.config.get('ocr.tencent.secretKey', '')}" style="width:100%;padding:7px;border:1px solid #ddd;border-radius:5px;font-size:12px;box-sizing:border-box;">
                            </div>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                            <span style="font-size: 10px; color: #999;">需要手机号+身份证实名</span>
                            <a href="#" onclick="window.open(_TUTORIAL_BASE_URL+'/tencent-ocr-apikey-tutorial','_blank');return false;" style="font-size:10px;color:#00a4ff;text-decoration:none;">📖 查看教程 →</a>
                        </div>
                    </div>

                    <div style="background: #f8f9fa; border-radius: 10px; padding: 14px; margin-bottom: 16px; border-left: 4px solid #ff9800;">
                        <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">🔸 GLM-4V-Flash (视觉模型兜底)</div>
                        <input type="password" id="set-glm4v-key" placeholder="智谱AI API Key" value="${this.config.get('ai.apiKey', '')}" style="width:100%;padding:7px;border:1px solid #ddd;border-radius:5px;font-size:12px;margin-bottom:4px;box-sizing:border-box;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-size: 10px; color: #999;">https://open.bigmodel.cn → 免费 → 识别率>95%</span>
                            <a href="https://open.bigmodel.cn" target="_blank" style="font-size:10px;color:#ff9800;text-decoration:none;">🔗 前往注册 →</a>
                        </div>
                    </div>

                    <div style="background: #fff3cd; border-radius: 10px; padding: 14px; margin-bottom: 16px; border-left: 4px solid #ffc107;">
                        <div style="font-weight: 600; font-size: 13px; margin-bottom: 8px;">🔄 六级降级链状态</div>
                        <div id="ocr-status-list" style="font-size: 11px; line-height: 2;"></div>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button id="setting-save" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">💾 保存配置</button>
                        <button id="setting-cancel" style="flex: 1; padding: 12px; background: #e0e0e0; color: #333; border: none; border-radius: 8px; cursor: pointer;">取消</button>
                    </div>
                </div>
            `;

            modal.appendChild(content);
            document.body.appendChild(modal);

            const statusList = document.getElementById('ocr-status-list');
            if (statusList) {
                const hasOcrSpace = !!this.config.get('ai.ocrSpaceKey', '');
                const hasBaidu = !!(this.config.get('ocr.baidu.apiKey', '') && this.config.get('ocr.baidu.secretKey', ''));
                const hasTencent = !!(this.config.get('ocr.tencent.secretId', '') && this.config.get('ocr.tencent.secretKey', ''));
                const hasGLM = !!this.config.get('ai.apiKey', '');
                const puterOn = this.config.get('ocr.puter.enabled', true);
                statusList.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;">
                        ${hasOcrSpace ? '<span style="color:#28a745;font-weight:600">✅ OCR.space</span>' : '<span style="color:#dc3545">❌ OCR.space (未配置)</span>'}
                        <a href="https://ocr.space/ocrapi/freekey" target="_blank" style="font-size:10px;color:#4CAF50;text-decoration:none;">📖 教程</a>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;">
                        ${hasBaidu ? '<span style="color:#28a745;font-weight:600">✅ 百度OCR</span>' : '<span style="color:#ccc">⬜ 百度OCR</span>'}
                        <a href="#" onclick="window.open(_TUTORIAL_BASE_URL+'/baidu-ocr-apikey-tutorial','_blank');return false;" style="font-size:10px;color:#667eea;text-decoration:none;">📖 教程</a>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;">
                        ${hasTencent ? '<span style="color:#28a745;font-weight:600">✅ 腾讯云</span>' : '<span style="color:#ccc">⬜ 腾讯云</span>'}
                        <a href="#" onclick="window.open(_TUTORIAL_BASE_URL+'/tencent-ocr-apikey-tutorial','_blank');return false;" style="font-size:10px;color:#00a4ff;text-decoration:none;">📖 教程</a>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;">
                        ${puterOn ? '<span style="color:#28a745">✅ Puter.js</span>' : '<span style="color:#dc3545">❌ Puter.js</span>'}
                        <span style="font-size:10px;color:#999">(无需配置)</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;">
                        <span style="color:#17a2b8">✅ Tesseract.js</span>
                        <span style="font-size:10px;color:#999">(无需配置)</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;">
                        ${hasGLM ? '<span style="color:#28a745;font-weight:600">✅ GLM-4V-Flash</span>' : '<span style="color:#ccc">⬜ GLM-4V</span>'}
                        <a href="https://open.bigmodel.cn" target="_blank" style="font-size:10px;color:#ff9800;text-decoration:none;">🔗 注册</a>
                    </div>
                `;
            }

            const saveBtn = document.getElementById('setting-save');
            if (saveBtn) {
                saveBtn.onclick = () => {
                    this.config.set('ai.ocrSpaceKey', document.getElementById('set-ocrspace-key').value.trim());
                    this.config.set('ocr.baidu.apiKey', document.getElementById('set-baidu-apikey').value.trim());
                    this.config.set('ocr.baidu.secretKey', document.getElementById('set-baidu-secretkey').value.trim());
                    this.config.set('ocr.tencent.secretId', document.getElementById('set-tencent-secretid').value.trim());
                    this.config.set('ocr.tencent.secretKey', document.getElementById('set-tencent-secretkey').value.trim());
                    this.config.set('ai.apiKey', document.getElementById('set-glm4v-key').value.trim());
                    modal.remove();
                    console.log('[v3.1] ✅ OCR配置已保存，六级降级链已更新');
                };
            }
            const cancelBtn = document.getElementById('setting-cancel');
            if (cancelBtn) cancelBtn.onclick = () => modal.remove();
            modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        }

        destroy() {
            if (this.panel && this.panel.parentNode) {
                this.panel.parentNode.removeChild(this.panel);
            }
        }
    }

    // ==================== 蓝队反制系统 ====================
    class BlueTeamDefense {
        constructor(config) {
            this.config = config;
            this._hooksInstalled = false;
            this._offlineCount = 0;
            this._lastOfflineTime = 0;
        }

        install() {
            if (this._hooksInstalled) return;
            this._hooksInstalled = true;
            this._hookFetch();
            this._hookXHR();
            console.log('🛡️ [BlueDefense] ✅ 蓝队反制系统已部署 (online.js防护 + 上报增强)');
        }

        _hookFetch() {
            const origFetch = window.fetch;
            window.fetch = async (...args) => {
                const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
                const response = await origFetch.apply(window, args);
                if (url.includes('/user/online')) {
                    return this._interceptOnlineResponse(response, 'fetch');
                }
                if (url.includes('/node/study')) {
                    return this._interceptStudyResponse(response);
                }
                return response;
            };
        }

        _hookXHR() {
            const origOpen = XMLHttpRequest.prototype.open;
            const origSend = XMLHttpRequest.prototype.send;
            const self = this;
            XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                this.__elegant_url = url;
                this.__elegant_method = method;
                return origOpen.apply(this, [method, url, ...rest]);
            };
            XMLHttpRequest.prototype.send = function(...args) {
                const xhr = this;
                const url = xhr.__elegant_url || '';
                if (url.includes('/user/online')) {
                    xhr.addEventListener('load', function() {
                        try { self._handleOnlineResponse(JSON.parse(xhr.responseText), 'xhr'); } catch(e) {}
                    });
                }
                return origSend.apply(this, args);
            };
        }

        async _interceptOnlineResponse(origResponse, source) {
            const clone = origResponse.clone();
            try {
                const data = await clone.json();
                if (data && data.offline === true) {
                    return this._handleOffline(data, source, origResponse);
                }
            } catch(e) {}
            return origResponse;
        }

        _handleOnlineResponse(data, source) {
            if (data && data.offline === true) {
                this._handleOffline(data, source, null);
            }
        }

        _handleOffline(data, source, origResponse) {
            const now = Date.now();
            if (now - this._lastOfflineTime < 30000) return;
            this._lastOfflineTime = now;
            this._offlineCount++;
            console.warn(`🛡️ [BlueDefense] 🔴 检测到蓝队强制下线信号! (来源: ${source}, 第${this._offlineCount}次)`);
            console.warn(`🛡️ [BlueDefense] 原始响应:`, JSON.stringify(data).substring(0, 200));
            const throttleKey = 'elegant_online_time';
            const lastOnline = parseInt(localStorage.getItem(throttleKey) || '0');
            localStorage.setItem(throttleKey, String(Math.floor(now / 1000)));
            if (origResponse) {
                const modifiedBody = new Response(JSON.stringify({ ...data, offline: false, msg: 'kept_alive' }), {
                    status: 200,
                    headers: origResponse.headers
                });
                console.log(`🛡️ [BlueDefense] ✅ 已拦截offline信号, 返回fake响应(offline=false)`);
                return modifiedBody;
            }
            console.log(`🛡️ [BlueDefense] ✅ XHR offline信号已记录(无法修改响应, 但阻止了localStorage节流重置)`);
        }

        async _interceptStudyResponse(origResponse) {
            const clone = origResponse.clone();
            try {
                const data = await clone.json();
                if (data && data.status === false && data.msg) {
                    const msg = data.msg;
                    if (msg.includes('提交学时失败')) {
                        console.warn(`🛡️ [BlueDefense] ⚠️ 学时提交失败: ${msg}`);
                        if (msg.includes('【1】')) {
                            console.warn(`🛡️ [BlueDefense] 📋 失败类型【1】: 服务端拒绝(可能totalTime不足或重复提交)`);
                        } else if (msg.includes('【2】')) {
                            console.warn(`🛡️ [BlueDefense] 📋 失败类型【2】: 验证码/签名错误`);
                        }
                    }
                }
            } catch(e) {}
            return origResponse;
        }
    }

    // ==================== L7 点选验证码解决器 ====================
    class ClickCaptchaSolver {
        constructor(networkClient) {
            this.networkClient = networkClient;
            this.ak = '38570387e765646dff8372d4ec9e3c38';
            this.enabled = true;
        }

        async solve(captchaContainer) {
            if (!this.enabled) return false;
            console.log('🎯 [L7-ClickCaptcha] 检测到点选验证码(need_code=2), 启动L7解决器...');
            const imgEl = captchaContainer.querySelector('img, canvas, [class*="img"], [class*="pic"], [class*="bg"]');
            if (!imgEl) {
                console.warn('🎯 [L7-ClickCaptcha] ⚠️ 未找到验证码图片元素');
                return false;
            }
            const rect = imgEl.getBoundingClientRect();
            console.log(`🎯 [L7-ClickCaptcha] 图片尺寸: ${rect.width}x${rect.height}`);
            try {
                const imgBase64 = this._extractImage(imgEl);
                const result = await this._callDunclickApi(imgBase64, Math.floor(rect.width), Math.floor(rect.height));
                if (result && result.data && result.data.length > 0) {
                    console.log(`🎯 [L7-ClickCaptcha] ✅ dunclick API返回 ${result.data.length} 个点击坐标`);
                    await this._simulateClicks(result.data, captchaContainer, rect);
                    return true;
                }
                console.warn('🎯 [L7-ClickCaptcha] ⚠️ dunclick API未返回有效坐标');
                return false;
            } catch (e) {
                console.error('🎯 [L7-ClickCaptcha] ❌ 解决失败:', e.message);
                return false;
            }
        }

        _extractImage(imgEl) {
            try {
                if (imgEl.tagName === 'CANVAS') {
                    return imgEl.toDataURL('image/png').split(',')[1];
                }
                const canvas = document.createElement('canvas');
                canvas.width = imgEl.naturalWidth || imgEl.width || 300;
                canvas.height = imgEl.naturalHeight || imgEl.height || 150;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(imgEl, 0, 0);
                return canvas.toDataURL('image/png').split(',')[1];
            } catch (e) {
                console.warn('🎯 [L7-ClickCaptcha] 图片提取失败:', e.message);
                return '';
            }
        }

        async _callDunclickApi(base64Img, width, height) {
            const url = 'https://www.dunclick.com/api/captcha';
            const body = JSON.stringify({
                ak: this.ak,
                image: base64Img,
                width: width,
                height: height,
                type: 'click'
            });
            console.log(`🎯 [L7-ClickCaptcha] 调用dunclick API (ak=${this.ak.substring(0,8)}..., 尺寸:${width}x${height})`);
            try {
                const res = await this.networkClient.gmFetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: body,
                    timeout: 15000
                });
                const data = JSON.parse(res);
                console.log(`🎯 [L7-ClickCaptcha] API响应:`, JSON.stringify(data).substring(0, 300));
                return data;
            } catch (e) {
                throw new Error(`dunclick API调用失败: ${e.message}`);
            }
        }

        async _simulateClicks(clickData, container, imgRect) {
            for (let i = 0; i < clickData.length; i++) {
                const point = clickData[i];
                const x = imgRect.left + (point.x / 100) * imgRect.width;
                const y = imgRect.top + (point.y / 100) * imgRect.height;
                console.log(`🎯 [L7-ClickCaptcha] 模拟点击#${i+1}: (${Math.floor(x)},${Math.floor(y)})`);
                this._dispatchMouseEvent(container, 'mousedown', x, y);
                await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
                this._dispatchMouseEvent(container, 'mouseup', x, y);
                this._dispatchMouseEvent(container, 'click', x, y);
                await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
            }
            const submitBtn = container.querySelector('button, [class*="submit"], [class*="confirm"], [class*="ok"]');
            if (submitBtn) {
                console.log('🎯 [L7-ClickCaptcha] 点击提交按钮');
                submitBtn.click();
            }
            console.log('🎯 [L7-ClickCaptcha] ✅ 所有点击已完成');
        }

        _dispatchMouseEvent(target, type, x, y) {
            const event = new MouseEvent(type, {
                clientX: x, clientY: y,
                bubbles: true, cancelable: true
            });
            target.dispatchEvent(event);
        }

        detectNeedCode2() {
            const layers = document.querySelectorAll('.layui-layer, [class*="layer"], [class*="modal"], [class*="dialog"]');
            for (const layer of layers) {
                const text = layer.textContent || '';
                if ((text.includes('请点击') || text.includes('请选择') || text.includes('click')) && layer.offsetHeight > 50) {
                    console.log('🎯 [L7-ClickCaptcha] 🔍 检测到点选验证码弹窗!');
                    return layer;
                }
            }
            return null;
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
            this.clickCaptchaSolver = new ClickCaptchaSolver(new NetworkClient());
            this._lastNodeId = env.nodeId;
            this._lastDuration = env.duration;
        }

        async start() {
            this.running = true;
            this.startTime = Date.now();
            console.log('🌟 优雅大师启动', this.env);

            this.ui.updateStatus(this.env.nodeId, this.env.duration, 0, '运行中');

            let apiSuccessCount = 0;
            let lastStudyId = null;

            const init = await this.api.study(1);
            console.log('[API] 初始调用原始响应:', JSON.stringify(init));
            if (!init.ok) {
                if (init.needCode) {
                    console.warn('⚠️ 需要验证码，尝试自动识别...');
                    const code = await this.checkCaptcha();
                    if (code) {
                        this.api._captchaCode = code;
                        const retryRes = await this.api.study(1, null, code);
                        console.log('[API] 验证码重试原始响应:', JSON.stringify(retryRes));
                        if (retryRes.ok) {
                            this.studyId = this._extractStudyId(retryRes.data);
                            lastStudyId = this.studyId;
                            apiSuccessCount++;
                            console.log('✅ 验证码通过！会话:', this.studyId);
                        } else {
                            console.warn('⚠️ 验证码验证失败:', retryRes.error);
                        }
                    } else {
                        console.warn('⚠️ 验证码识别失败，无法启动');
                    }
                } else {
                    console.warn('⚠️ 初始化上报失败:', init.error);
                }
            } else {
                this.studyId = this._extractStudyId(init.data);
                lastStudyId = this.studyId;
                apiSuccessCount++;
                console.log('✅ 会话:', this.studyId, '| 原始响应:', JSON.stringify(init.data).substring(0, 300));
            }

            const jumpSize = this.config.get('speed.jumpSize', 30);
            let interval = this.config.get('speed.reportInterval', 2000);
            const targetPercent = this.config.get('completion.targetPercent', 0.95);
            const target = Math.floor(this.env.duration * targetPercent);
            const loops = Math.ceil(target / jumpSize);

            const randomJitter = this.config.get('antiCheat.randomJitter', 300);

            console.log(`⚡ 上报: ${loops}次, 基础间隔${interval}ms, 跳跃${jumpSize}s, 目标${Math.floor(targetPercent*100)}%, 抖动±${randomJitter}ms`);

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
                        const l7Container = this.clickCaptchaSolver.detectNeedCode2();
                        if (l7Container) {
                            console.warn(`⚠️ 检测到L7点选验证码(need_code=2)，启动ClickCaptchaSolver...`);
                            const l7Solved = await this.clickCaptchaSolver.solve(l7Container);
                            if (l7Solved) {
                                await this.sleep(2000);
                                const retryRes = await this.api.study(time, this.studyId);
                                if (retryRes.ok) {
                                    this.studyId = this._extractStudyId(retryRes.data) || this.studyId;
                                    if (this.studyId) lastStudyId = this.studyId;
                                    apiSuccessCount++;
                                    console.log('✅ L7点选验证码通过! (累计成功:', apiSuccessCount, ')');
                                    captchaFailCount = 0;
                                } else {
                                    console.warn('⚠️ L7点选后重试失败:', retryRes.error);
                                    captchaFailCount++;
                                    i--;
                                    await this.sleep(3000);
                                }
                            } else {
                                console.warn('⚠️ L7点选解决失败，降级为文本验证码处理');
                                captchaFailCount++;
                                i--;
                                await this.sleep(3000);
                            }
                            continue;
                        }
                        console.warn(`⚠️ 上报需要验证码 (${captchaFailCount + 1}/${maxCaptchaFails})，尝试自动识别...`);
                        const captchaImg = document.querySelector('#codeImg, img[src*="/service/code"]');
                        if (captchaImg) captchaImg.click();
                        await this.sleep(1500);
                        const code = await this.checkCaptcha();
                        if (code) {
                            this.api._captchaCode = code;
                            const retryRes = await this.api.study(time, this.studyId, code);
                            console.log(`[API] 验证码重试(time=${time}):`, JSON.stringify(retryRes));
                            if (retryRes.ok) {
                                this.studyId = this._extractStudyId(retryRes.data) || this.studyId;
                                if (this.studyId) lastStudyId = this.studyId;
                                apiSuccessCount++;
                                console.log('✅ 验证码通过，继续上报 (累计成功:', apiSuccessCount, ')');
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
                        console.warn('⚠️ 上报失败，回退重试');
                        i--;
                        await this.sleep(3000);
                        continue;
                    }
                    console.warn(`⚠️ 上报异常(${time}s):`, res.error);
                } else {
                    captchaFailCount = 0;
                    apiSuccessCount++;
                    if (!this.studyId && res.data) {
                        this.studyId = this._extractStudyId(res.data) || this.studyId;
                        if (this.studyId) lastStudyId = this.studyId;
                    }
                }

                const pct = Math.min(Math.floor(time / this.env.duration * 100), 100);
                this.ui.updateStatus(this._lastNodeId, this._lastDuration, pct, '运行中');

                if (i < loops - 1 && this.running) {
                    const jitter = (Math.random() - 0.5) * 2 * randomJitter;
                    await this.sleep(Math.max(interval + jitter, 500));
                }
            }

            const finalTime = this.env.duration;
            const finalRes = await this.api.study(finalTime, this.studyId);
            console.log(`[API] 最终调用(${finalTime}s):`, JSON.stringify(finalRes));
            if (finalRes.ok) {
                apiSuccessCount++;
                if (!this.studyId && finalRes.data) {
                    this.studyId = this._extractStudyId(finalRes.data) || this.studyId;
                    if (this.studyId) lastStudyId = this.studyId;
                }
            }

            const elapsed = (Date.now() - this.startTime) / 1000;

            if (apiSuccessCount > 0) {
                console.log(`✅ 完成！耗时: ${elapsed.toFixed(1)}秒, 成功上报${apiSuccessCount}次, 最终studyId: ${lastStudyId}, 记录: ${this.env.duration}秒`);
                this.ui.updateStatus(this._lastNodeId, this._lastDuration, 100, '完成');
                const completedNodes = JSON.parse(localStorage.getItem('elegant_completed_nodes') || '[]');
                if (!completedNodes.includes(this.env.nodeId)) {
                    completedNodes.push(this.env.nodeId);
                    localStorage.setItem('elegant_completed_nodes', JSON.stringify(completedNodes));
                    console.log(`📝 [完成记录] 节点${this.env.nodeId}已标记为完成`);
                }
            } else {
                console.error(`❌ 失败！所有${loops+1}次API调用均未成功, 耗时: ${elapsed.toFixed(1)}秒`);
                this.ui.updateStatus(this._lastNodeId, this._lastDuration, 0, '失败');
                const failedNodes = JSON.parse(localStorage.getItem('elegant_failed_nodes') || '[]');
                if (!failedNodes.includes(this.env.nodeId)) {
                    failedNodes.push(this.env.nodeId);
                    localStorage.setItem('elegant_failed_nodes', JSON.stringify(failedNodes));
                    console.log(`📝 [失败记录] 节点${this.env.nodeId}已标记为失败`);
                }
            }

            if (apiSuccessCount > 0 && this.config.get('autoNext.enabled', true)) {
                await this._waitForRealPlayback();
                await this.autoNext();
            } else if (apiSuccessCount === 0) {
                console.error('❌ 本节点全部失败，不自动跳转下一节');
            }

            return apiSuccessCount > 0;
        }

        async _waitForRealPlayback() {
            const video = document.querySelector('video');
            if (!video) {
                console.log('📺 [RealPlay] 未找到视频元素，跳过真实播放等待');
                return;
            }
            try {
                if (video.paused) {
                    await video.play();
                    console.log('📺 [RealPlay] 视频已启动播放');
                }
                this._simulateMouseTrail(video);
                this._hijackTotalTime(video);
                const targetPercent = this.config.get('completion.realPlayPercent', 0.7);
                const duration = video.duration || this.env.duration || 1728;
                const targetTime = duration * targetPercent;
                const dynamicMaxWait = Math.max(Math.ceil(targetTime * 1.5), 600);
                console.log(`📺 [RealPlay] 开始等待: 目标${Math.floor(targetPercent*100)}% (${Math.floor(targetTime)}秒), 动态最大等待${dynamicMaxWait}秒(视频总长${Math.floor(duration)}s)`);
                const startTime = Date.now();
                let lastLogTime = 0;
                while (Date.now() - startTime < dynamicMaxWait * 1000) {
                    const currentVideoTime = video.currentTime || 0;
                    const currentTotalTime = window.totalTime || 0;
                    const elapsed = (Date.now() - startTime) / 1000;
                    if (currentVideoTime >= targetTime || currentTotalTime >= targetTime) {
                        console.log(`✅ [RealPlay] 达到目标! video=${Math.floor(currentVideoTime)}s, totalTime=${Math.floor(currentTotalTime)}s, 耗时${Math.floor(elapsed)}s`);
                        return;
                    }
                    if (elapsed - lastLogTime >= 15) {
                        console.log(`📺 [RealPlay] 进度: video=${Math.floor(currentVideoTime)}/${Math.floor(duration)}s(${Math.floor(currentVideoTime/duration*100)}%), totalTime=${Math.floor(currentTotalTime)}s, 已等${Math.floor(elapsed)}s/${dynamicMaxWait}s`);
                        lastLogTime = elapsed;
                    }
                    await this.sleep(2000);
                }
                const finalVideoTime = video.currentTime || 0;
                const finalTotalTime = window.totalTime || 0;
                console.warn(`⚠️ [RealPlay] 等待超时(${dynamicMaxWait}s), 最终状态: video=${Math.floor(finalVideoTime)}s(${Math.floor(finalVideoTime/duration*100)}%), totalTime=${Math.floor(finalTotalTime)}s`);
                if (finalTotalTime < duration * 0.5) {
                    console.warn(`⚠️ [RealPlay] totalTime过低(${finalTotalTime}/${duration}), 章节可能无法解锁! 建议增加realPlayPercent或检查劫持状态`);
                }
            } catch (e) {
                console.warn('⚠️ [RealPlay] 播放失败:', e.message);
            }
        }

        _simulateMouseTrail(video) {
            if (window.__elegant_mouse_simulated) return;
            window.__elegant_mouse_simulated = true;
            const videoContainer = document.querySelector('#videoContent') || document.querySelector('.video-box') || document.body;
            if (!videoContainer) return;
            let moveCount = 0;
            const maxMoves = 300;
            let lastX = -1, lastY = -1;
            const mouseTimer = setInterval(() => {
                try {
                    if (moveCount >= maxMoves) {
                        clearInterval(mouseTimer);
                        console.log('🖱️ [MouseTrail] 鼠标轨迹模拟完成 (300次移动, Plan H增强版)');
                        return;
                    }
                    const rect = videoContainer.getBoundingClientRect();
                    let x, y;
                    if (lastX < 0 || Math.random() < 0.3) {
                        x = rect.left + Math.random() * rect.width * 0.8 + rect.width * 0.1;
                        y = rect.top + Math.random() * rect.height * 0.8 + rect.height * 0.1;
                    } else {
                        x = lastX + (Math.random() - 0.5) * 100;
                        y = lastY + (Math.random() - 0.5) * 80;
                        x = Math.max(rect.left + 10, Math.min(rect.right - 10, x));
                        y = Math.max(rect.top + 10, Math.min(rect.bottom - 10, y));
                    }
                    lastX = x; lastY = y;
                    const event = new MouseEvent('mousemove', {
                        clientX: x, clientY: y,
                        bubbles: true, cancelable: true
                    });
                    document.body.dispatchEvent(event);
                    moveCount++;
                } catch (e) {}
            }, 2000 + Math.random() * 4000);
            window.__elegant_mouse_timer = mouseTimer;
            console.log('🖱️ [MouseTrail] ✅ 鼠标轨迹模拟启动 v2 (对抗蓝队#4层反作弊, 300次, 贝塞尔式移动)');
        }

        _hijackTotalTime(video) {
            if (window.__elegant_totaltime_hijacked) {
                console.log('🔓 [Hijack] totalTime劫持已激活，跳过重复安装');
                return;
            }
            window.__elegant_totaltime_hijacked = true;
            const speedMultiplier = this.config.get('hijack.speedMultiplier', 2);
            const boostInterval = this.config.get('hijack.boostIntervalMs', 1000);
            const duration = video.duration || this.env.duration || 1728;
            console.log(`🔓 [Hijack] ⚡ totalTime劫持攻击启动! (Plan H-全栈穿透 v2)`);
            console.log(`🔓 [Hijack] 加速倍率: ${speedMultiplier}x(含±1随机抖动), 增强间隔: ${boostInterval}ms, 视频时长: ${Math.floor(duration)}秒`);
            const originalTotalTime = window.totalTime || 0;
            let lastBoosted = originalTotalTime;
            let stagnantCount = 0;
            const STAGNANT_THRESHOLD = 3;
            let boostTimer = setInterval(() => {
                try {
                    if (typeof window.totalTime === 'undefined') {
                        window.totalTime = lastBoosted;
                    }
                    const prevTotalTime = window.totalTime;
                    const jitter = Math.floor(Math.random() * 3) - 1;
                    const boostAmount = speedMultiplier + jitter;
                    window.totalTime += boostAmount;
                    if (window.totalTime <= prevTotalTime) {
                        stagnantCount++;
                        console.warn(`🔓 [Hijack] ⚠️ totalTime未增长(${prevTotalTime}→${window.totalTime}), 可能被蓝队重置! 次数:${stagnantCount}/${STAGNANT_THRESHOLD}`);
                        if (stagnantCount >= STAGNANT_THRESHOLD) {
                            console.warn(`🔓 [Hijack] 🔴 连续${STAGNANT_THRESHOLD}次停滞，强制重设totalTime!`);
                            window.totalTime = lastBoosted + boostAmount * (stagnantCount + 1);
                            stagnantCount = 0;
                        }
                    } else {
                        stagnantCount = 0;
                    }
                    lastBoosted = window.totalTime;
                    if (window.totalTime % 60 === 0 || window.totalTime >= duration) {
                        console.log(`🔓 [Hijack] ⚡ totalTime已劫持: ${window.totalTime}s (视频${Math.floor(video.currentTime||0)}/${Math.floor(duration)}s, ${Math.floor((video.currentTime||0)/duration*100)}%) [+${boostAmount}]`);
                    }
                    if (window.totalTime >= duration) {
                        clearInterval(boostTimer);
                        console.log(`🔓 [Hijack] ✅ totalTime已达目标(${window.totalTime}s >= ${duration}s), 基础劫持完成，转入维持模式`);
                        window.__elegant_hijack_maintenance = setInterval(() => {
                            try { if (typeof window.totalTime !== 'undefined') window.totalTime += 1; } catch(e) {}
                        }, 5000);
                    }
                } catch (e) {
                    console.warn('🔓 [Hijack] 劫持异常:', e.message);
                }
            }, boostInterval);
            window.__elegant_hijack_timer = boostTimer;
            const origSendTime = window.sendTime;
            if (origSendTime && !window.__elegant_sendtime_hooked) {
                window.__elegant_sendtime_hooked = true;
                window.sendTime = function(force, code) {
                    try {
                        if (typeof window.totalTime !== 'undefined' && window.totalTime > 0) {
                            const origST = window.studyTime || 0;
                            window.studyTime = window.totalTime;
                            console.log(`🔓 [HijackHook] sendTime拦截: studyTime ${origSt} → ${window.studyTime} (totalTime=${window.totalTime})`);
                        }
                    } catch (e) {}
                    return origSendTime.apply(this, arguments);
                };
                console.log('🔓 [Hijack] ✅ sendTime() 已挂钩 - 上报时强制使用劫持后的totalTime');
            }
            const self = this;
            window.__elegant_hijack_watchdog = setInterval(() => {
                try {
                    if (!window.__elegant_hijack_timer && !window.__elegant_hijack_maintenance) {
                        console.warn('🔓 [WatchDog] 🔴 检测到劫持timer丢失! 尝试重新安装...');
                        self._hijackTotalTime(video);
                    }
                    if (window.__elegant_hijack_timer && window.totalTime < lastBoosted - 10) {
                        console.warn(`🔓 [WatchDog] ⚠️ totalTime异常回退(${lastBoosted}→${window.totalTime}), 蓝队可能重置了计数器`);
                    }
                } catch(e) {}
            }, 10000);
            window.addEventListener('beforeunload', () => {
                if (window.__elegant_hijack_timer) clearInterval(window.__elegant_hijack_timer);
                if (window.__elegant_hijack_maintenance) clearInterval(window.__elegant_hijack_maintenance);
                if (window.__elegant_hijack_watchdog) clearInterval(window.__elegant_hijack_watchdog);
            });
            console.log(`🔓 [Hijack] 🎯 劫持系统v2完全部署! 含: 加速引擎+sendTime挂钩+看门狗+停滞检测+维持模式`);
        }

        async checkCaptcha(attempt = 1) {
            const captchaImg = document.querySelector('#codeImg, img[src*="/service/code"]');
            if (!captchaImg) return null;

            console.log(`🔍 [v3.1] 发现验证码图片 (第${attempt}次尝试)，启动六级全自动降级链...`);
            try {
                const code = await this.ocrEngine.recognize(captchaImg);
                if (code && code.length >= 3) {
                    console.log('✅ [v3.1] 验证码自动识别成功:', code);
                    this._fillAndSubmitCaptcha(code);
                    return code;
                }
                console.warn('⚠️ [v3.1] OCR识别结果无效:', code);
            } catch (e) {
                console.error('❌ [v3.1] 六级降级链全部失败:', e.message);
            }

            console.warn('⚠️ [v3.1] 全自动OCR失败，刷新验证码后重试...');
            return null;
        }

        _fillAndSubmitCaptcha(code) {
            const input = document.querySelector('input[placeholder*="验证码"], input[name*="code"], #yzm, #yzCode');
            if (input) {
                this._spoofTwFingerprint(input);
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(input, code);
                input.dispatchEvent(new Event('input', {bubbles: true}));
                input.dispatchEvent(new Event('change', {bubbles: true}));
                console.log('✅ 验证码已自动填入(含tw指纹欺骗):', code);
            }
            const playBtn = document.querySelector('.layui-layer-btn0, [class*="layer-btn0"]');
            if (playBtn) playBtn.click();
            this._captchaCode = code;
        }

        _spoofTwFingerprint(input) {
            try {
                input.dispatchEvent(new MouseEvent('mousedown', {
                    bubbles: true, cancelable: true, clientX: 100, clientY: 100
                }));
                input.dispatchEvent(new MouseEvent('mouseup', {
                    bubbles: true, cancelable: true, clientX: 100, clientY: 100
                }));
                input.focus();
                console.log('🔑 [TwSpoof] ✅ tw指纹欺骗成功 - 模拟真实用户鼠标点击输入框');
            } catch (e) {
                console.warn('🔑 [TwSpoof] ⚠️ tw欺骗失败(非致命):', e.message);
            }
        }

        async autoNext() {
            const delay = this.config.get('autoNext.delay', 3000);
            console.log(`⏳ [autoNext] 等待${delay}ms后跳转下一节...`);
            await this.sleep(delay);

            const failedNodes = JSON.parse(localStorage.getItem('elegant_failed_nodes') || '[]');
            const completedNodes = JSON.parse(localStorage.getItem('elegant_completed_nodes') || '[]');

            try {
                let nextId = (parseInt(this.env.nodeId) + 1).toString();
                let attempts = 0;
                const maxAttempts = 5;

                while (attempts < maxAttempts) {
                    if (completedNodes.includes(nextId)) {
                        console.log(`⏭️ [autoNext] 节点${nextId}已完成，跳过...`);
                        nextId = (parseInt(nextId) + 1).toString();
                        attempts++;
                        continue;
                    }
                    if (failedNodes.includes(nextId)) {
                        console.log(`⏭️ [autoNext] 节点${nextId}之前失败过，跳过...`);
                        nextId = (parseInt(nextId) + 1).toString();
                        attempts++;
                        continue;
                    }
                    break;
                }

                if (attempts >= maxAttempts) {
                    console.error('❌ [autoNext] 连续跳过5个节点，停止自动跳转');
                    localStorage.removeItem('elegant_was_running');
                    alert('优雅大师: 已跳过5个节点，可能课程已完成或遇到问题');
                    return;
                }

                const targetUrl = location.pathname + '?nodeId=' + nextId;
                console.log(`➡️  [autoNext] 目标URL: ${targetUrl}, 当前URL: ${location.href}`);

                sessionStorage.setItem('elegant_autostart', '1');
                localStorage.setItem('elegant_last_attempt_node', nextId);
                console.log(`✅ [autoNext] 已设置自动启动标记`);

                const links = document.querySelectorAll('a[href*="node"]');
                let foundDomLink = false;
                for (const link of links) {
                    if (link.href && link.href.includes(`nodeId=${nextId}`)) {
                        console.log(`🔗 [autoNext] 方式1: 找到DOM链接，点击跳转 -> ${link.href}`);
                        link.click();
                        foundDomLink = true;
                        break;
                    }
                }

                if (!foundDomLink) {
                    console.log(`🔗 [autoNext] 未找到DOM链接，生成虚拟链接点击...`);
                    const a = document.createElement('a');
                    a.href = targetUrl;
                    a.id = 'elegant-auto-next-link';
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    await this.sleep(500);
                    if (a.parentNode) a.remove();
                }

                await this.sleep(1500);

                if (location.href.includes(nextId)) {
                    console.log(`✅ [autoNext] 跳转成功! 新URL: ${location.href}`);
                    const errorEl = document.querySelector('.error-content, h4');
                    if (errorEl && errorEl.textContent.includes('当前章节尚未解锁')) {
                        console.warn(`⚠️ [autoNext] 目标节点${nextId}未解锁，标记为失败并跳过...`);
                        failedNodes.push(nextId);
                        localStorage.setItem('elegant_failed_nodes', JSON.stringify(failedNodes));
                        await this.sleep(2000);
                        console.log(`🔄 [autoNext] 2秒后重新尝试下一个节点...`);
                        return this.autoNext();
                    }
                } else {
                    console.warn(`⚠️ [autoNext] 链接点击未生效，尝试 location.assign()...`);
                    try {
                        if (typeof unsafeWindow !== 'undefined') {
                            unsafeWindow.location.assign(targetUrl);
                        } else {
                            window.location.assign(targetUrl);
                        }
                    } catch(e) {
                        console.warn(`⚠️ [autoNext] assign()异常: ${e.message}, 尝试 location.href...`);
                        window.location.href = targetUrl;
                    }

                    await this.sleep(1500);

                    if (!window.location.href.includes(nextId)) {
                        console.error(`❌ [autoNext] 所有跳转方式均失败`);
                        console.error(`❌ [autoNext] 期望包含: ${nextId}, 实际: ${location.href}`);
                        failedNodes.push(nextId);
                        localStorage.setItem('elegant_failed_nodes', JSON.stringify(failedNodes));
                        alert(`优雅大师: 自动跳转下一节失败(${nextId})，请手动点击课程目录中的下一节`);
                    }
                }
            } catch (e) {
                console.error(`❌ [autoNext] 异常:`, e.message, e.stack);
                alert(`自动下一节出错: ${e.message}`);
            }
        }

        _extractStudyId(data) {
            if (!data) {
                console.warn('[ExtractStudyId] data为空:', typeof data, data);
                return null;
            }
            if (typeof data === 'string') {
                if (data.length > 0) return data;
                return null;
            }
            if (data.studyId) return data.studyId;
            if (data.data) {
                if (typeof data.data === 'string' && data.data.length > 0) return data.data;
                if (data.data && data.data.studyId) return data.data.studyId;
            }
            if (data.result) {
                if (typeof data.result === 'string' && data.result.length > 0) return data.result;
                if (data.result && data.result.studyId) return data.result.studyId;
            }
            if (data.id) return String(data.id);
            if (data.session_id) return data.session_id;
            if (data.sessionId) return data.sessionId;
            for (const key of Object.keys(data)) {
                const val = data[key];
                if (typeof val === 'string' && val.length > 5 && val.length < 100 && /^[a-zA-Z0-9_-]+$/.test(val)) {
                    return val;
                }
            }
            console.warn('[ExtractStudyId] 无法从数据中提取studyId, keys:', Object.keys(data));
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

        async autoLogin() {
            if (!location.pathname.includes('/login')) return false;
            console.log('🔐 [AutoLogin] 检测到登录页，开始自动登录...');
            this.ui.updateStatus('--', '--', 0, '🔐 尝试自动登录...');

            const userEl = document.querySelector('input[name="username"], input[placeholder*="学号"], input[placeholder*="用户名"]');
            const passEl = document.querySelector('input[name="password"], input[placeholder*="密码"], input[type="password"]');
            const codeEl = document.querySelector('input[name="code"], input[placeholder*="验证码"]');
            const codeImg = document.getElementById('codeImg');
            const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '登录');

            if (!userEl || !passEl || !codeEl) {
                console.error('❌ [AutoLogin] 登录表单元素不完整', { user: !!userEl, pass: !!passEl, code: !!codeEl });
                return false;
            }

            const credentials = this._getCredentials();
            userEl.value = credentials.username;
            passEl.value = credentials.password;
            console.log(`🔐 [AutoLogin] 账号已填写: ${credentials.username}`);

            if (!codeImg) {
                submitBtn?.click();
                return true;
            }

            const ocrEngine = new OCREngine(this.config);
            const success = await ocrEngine.solveWithRetry(
                () => document.getElementById('codeImg'),
                (code) => { codeEl.value = code; },
                async () => {
                    submitBtn?.click();
                    await new Promise(r => setTimeout(r, 3000));
                    return !location.pathname.includes('/login');
                }
            );

            if (success) {
                console.log('✅ [AutoLogin] 登录成功！');
                return true;
            } else {
                const hasAnyKey = this.config.get('ocr.baidu.apiKey', '') || this.config.get('ai.ocrSpaceKey', '') || this.config.get('ocr.tencent.secretId', '');
                console.warn('⚠️ [AutoLogin] 自动登录失败，请手动输入验证码');
                this.ui.updateStatus('--', '--', 0, hasAnyKey ? '⚠️ 验证码识别失败，请手动输入' : '💡 首次使用？点AI配置可提升识别率');
                return false;
            }
        }

        _getCredentials() {
            const saved = JSON.parse(localStorage.getItem('elegant_credentials') || '{}');
            if (saved.username && saved.password) return saved;
            return { username: '', password: '' };
        }

        async start() {
            if (this.running) {
                console.warn('⚠️ 已有实例运行中');
                return false;
            }
            const isLockPage = document.body?.textContent?.includes('当前章节尚未解锁') || document.title === '错误提示';
            if (isLockPage) {
                const currentId = new URLSearchParams(location.search).get('nodeId') || '';
                const prevId = (parseInt(currentId) - 1).toString();
                console.warn(`⚠️ [start] 检测到章节锁定页面(${currentId})，回退到${prevId}...`);
                localStorage.removeItem('elegant_autostart');
                localStorage.removeItem('elegant_last_attempt_node');
                localStorage.setItem('elegant_was_running', '1');
                location.href = `/user/node?nodeId=${prevId}`;
                return false;
            }
            this.running = true;
            localStorage.setItem('elegant_was_running', '1');
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
            localStorage.removeItem('elegant_was_running');
        }

        async checkAndAutoNext() {
            const env = this.detectEnvironment();
            if (!env) return;
            const currentId = env.nodeId;
            console.log(`🔍 [checkAutoNext] 检查节点${currentId}的下一节是否解锁...`);
            const nextId = (parseInt(currentId) + 1).toString();
            try {
                const resp = await fetch(`/user/node?nodeId=${nextId}`, {
                    credentials: 'include',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                const text = await resp.text();
                const LOCK_KEYWORDS = ['尚未解锁', '错误提示', '当前章节', '参数错误', '无法找到'];
                const isLocked = LOCK_KEYWORDS.some(kw => text.includes(kw)) ||
                    (resp.status >= 300 && resp.status < 400) ||
                    resp.type === 'opaqueredirect';
                const hasVideoContent = text.includes('video') || text.includes('duration') || text.includes('讨论区');
                const isLockedStrict = isLocked || !hasVideoContent;
                if (isLockedStrict) {
                    console.warn(`⚠️ [checkAutoNext] 下一节(${nextId})仍被锁定! 响应状态=${resp.status}, 类型=${resp.type}, 有视频内容=${hasVideoContent}`);
                    const completedNodes = JSON.parse(localStorage.getItem('elegant_completed_nodes') || '[]');
                    const idx = completedNodes.indexOf(currentId);
                    if (idx > -1) { completedNodes.splice(idx, 1); localStorage.setItem('elegant_completed_nodes', JSON.stringify(completedNodes)); }
                    localStorage.removeItem('elegant_last_attempt_node');
                    localStorage.setItem('elegant_autostart', '1');
                    console.log(`🔄 [checkAutoNext] 2秒后重新启动节点${currentId}...`);
                    setTimeout(() => this.start(), 2000);
                } else {
                    console.log(`✅ [checkAutoNext] 下一节(${nextId})已解锁! 跳转中...`);
                    this.autoNext();
                }
            } catch(e) {
                console.log(`🔄 [checkAutoNext] 检测失败，尝试直接跳转...`);
                this.autoNext();
            }
        }

        async autoNext() {
            const env = this.detectEnvironment();
            if (!env) {
                console.error('❌ [autoNext] 无法检测当前环境');
                return;
            }
            
            const delay = this.config.get('autoNext.delay', 3000);
            console.log(`⏳ [autoNext] 等待${delay}ms后跳转下一节...`);
            await this._sleep(delay);

            const completedNodes = JSON.parse(localStorage.getItem('elegant_completed_nodes') || '[]');

            let nextId = (parseInt(env.nodeId) + 1).toString();
            let skipCount = 0;
            const maxSkip = 10;

            while (skipCount < maxSkip) {
                if (completedNodes.includes(nextId)) {
                    console.log(`⏭️ [autoNext] 节点${nextId}已完成，跳过...`);
                    nextId = (parseInt(nextId) + 1).toString();
                    skipCount++;
                    continue;
                }
                break;
            }

            if (skipCount >= maxSkip) {
                console.log('🎉 [autoNext] 连续跳过10个已完成节点，可能课程已完成');
                localStorage.removeItem('elegant_was_running');
                alert('优雅大师: 课程可能已完成！');
                return;
            }

            const targetUrl = location.pathname + '?nodeId=' + nextId;
            console.log(`➡️  [autoNext] 目标URL: ${targetUrl}`);

            sessionStorage.setItem('elegant_autostart', '1');
            localStorage.setItem('elegant_last_attempt_node', nextId);

            const links = document.querySelectorAll('a[href*="node"]');
            let foundDomLink = false;
            for (const link of links) {
                if (link.href && link.href.includes(`nodeId=${nextId}`)) {
                    console.log(`🔗 [autoNext] 找到DOM链接，点击跳转 -> ${link.href}`);
                    link.click();
                    foundDomLink = true;
                    break;
                }
            }

            if (!foundDomLink) {
                console.log(`🔗 [autoNext] 未找到DOM链接，使用location.href跳转...`);
                window.location.href = targetUrl;
            }
        }

        _sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
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
            } else if (video && video.readyState < 1) {
                console.log('⏳ [detectEnvironment] video未准备好，等待...');
                return null;
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
        const defense = new BlueTeamDefense(configMgr);
        defense.install();

        ui.setEngine(engine);
        ui.create();

        window.MasterEngine = engine;
        window.ElegantConfig = configMgr;

        try {
            if (typeof unsafeWindow !== 'undefined') {
                unsafeWindow.MasterEngine = engine;
                unsafeWindow.ElegantConfig = configMgr;
                console.log('[Init] ✅ 已通过unsafeWindow暴露到页面');
            }
        } catch(e) {
            console.warn('[Init] ⚠️ unsafeWindow不可用:', e.message);
        }

        document.documentElement.setAttribute('data-elegant-master', 'loaded');
        console.log('[Init] ✅ 优雅大师就绪, nodeId检测:', !!engine.env);

        if (location.pathname.includes('/login')) {
            console.log('🔐 [Init] 检测到登录页，启动自动登录...');
            const userEl = document.querySelector('input[placeholder*="学号"], input[placeholder*="用户名"]');
            const passEl = document.querySelector('input[placeholder*="密码"], input[type="password"]');
            if (userEl && passEl && userEl.value && passEl.value) {
                localStorage.setItem('elegant_credentials', JSON.stringify({ username: userEl.value, password: passEl.value }));
            }
            const loggedIn = await engine.autoLogin();
            if (loggedIn) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                const newEnv = engine.detectEnvironment();
                if (newEnv) {
                    ui.updateStatus(newEnv.nodeId, newEnv.duration, 0, '待机');
                    const autoNextEnabled = configMgr.get('autoNext.enabled', false);
                    if (autoNextEnabled) { setTimeout(() => engine.start(), 2000); return; }
                }
            } else {
                ui.updateStatus(null, null, null, '需手动登录');
            }
        }

        const params = new URLSearchParams(location.search);
        const paramNodeId = params.get("nodeId");
        const hasNodeId = paramNodeId || location.pathname.match(/\/node\/(\d+)/);
        
        if (!hasNodeId) {
            console.log('⚠️  未检测到学习节点URL，请先访问课程页面');
            return;
        }

        const tryInitWithRetry = (retryCount = 0) => {
            const env = engine.detectEnvironment();
            
            if (!env && retryCount < 10) {
                console.log(`⏳ [Init] 环境检测中... 尝试 ${retryCount + 1}/10`);
                setTimeout(() => tryInitWithRetry(retryCount + 1), 500);
                return;
            }
            
            if (!env) {
                console.log('⚠️  环境检测超时，但URL有nodeId，尝试从URL获取信息');
                const nodeId = paramNodeId || location.pathname.match(/\/node\/(\d+)/)[1];
                ui.updateStatus(nodeId, 3600, 0, '待机');
                console.log('🌟 优雅大师已就绪，点击"🚀 启动"开始');
                return;
            }
            
            const lastAttempt = localStorage.getItem('elegant_last_attempt_node');
            if (lastAttempt && env.nodeId !== lastAttempt) {
                console.warn(`⚠️ [Init] 尝试跳转到${lastAttempt}但被重定向到${env.nodeId}`);
                console.log('📌 [Init] 这是章节锁定机制，下一节尚未解锁');
                localStorage.removeItem('elegant_last_attempt_node');
                const completedNodes = JSON.parse(localStorage.getItem('elegant_completed_nodes') || '[]');
                if (!completedNodes.includes(env.nodeId)) {
                    completedNodes.push(env.nodeId);
                    localStorage.setItem('elegant_completed_nodes', JSON.stringify(completedNodes));
                    console.log(`✅ [Init] 节点${env.nodeId}已完成，保留完成标记`);
                }
                const lockCount = parseInt(localStorage.getItem('elegant_chapter_lock_count') || '0') + 1;
                localStorage.setItem('elegant_chapter_lock_count', lockCount.toString());
                if (lockCount >= 3) {
                    console.log(`⏸️ [Init] 章节锁定${lockCount}次，等待30秒后重试...`);
                    localStorage.setItem('elegant_chapter_lock_count', '0');
                    setTimeout(() => engine.autoNext(), 30000);
                } else {
                    console.log(`⏸️ [Init] 章节锁定${lockCount}次，等待10秒后重试...`);
                    setTimeout(() => engine.autoNext(), 10000);
                }
                return;
            }
            
            ui.updateStatus(env.nodeId, env.duration, 0, '待机');
            const autoNextEnabled = configMgr.get('autoNext.enabled', false);
            const autoStartFlag = sessionStorage.getItem('elegant_autostart');
            const wasRunning = localStorage.getItem('elegant_was_running');
            
            const completedNodes = JSON.parse(localStorage.getItem('elegant_completed_nodes') || '[]');
            const isCompleted = completedNodes.includes(env.nodeId);
            if (isCompleted && autoNextEnabled) {
                console.log(`⏭️ 节点${env.nodeId}已完成，检查下一节是否解锁...`);
                engine.checkAndAutoNext();
            } else if (autoNextEnabled && (autoStartFlag === '1' || wasRunning === '1')) {
                sessionStorage.removeItem('elegant_autostart');
                console.log('🔄 自动续刷模式，2秒后启动...');
                setTimeout(() => engine.start(), 2000);
            } else {
                console.log('🌟 优雅大师已就绪，点击"🚀 启动"开始');
            }
        };
        
        tryInitWithRetry();

        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                const oldUrl = lastUrl;
                lastUrl = location.href;
                console.log('🔄 URL 变化，重新检测环境:', location.href);
                
                const lastAttempt = localStorage.getItem('elegant_last_attempt_node');
                if (lastAttempt) {
                    const currentId = new URLSearchParams(location.search).get('nodeId');
                    if (currentId && currentId !== lastAttempt) {
                        console.warn(`⚠️ [URL变化] 尝试跳转到${lastAttempt}但被重定向到${currentId}`);
                        console.log('📌 [URL变化] 这是章节锁定机制，下一节尚未解锁');
                        localStorage.removeItem('elegant_last_attempt_node');
                        const completedNodes = JSON.parse(localStorage.getItem('elegant_completed_nodes') || '[]');
                        if (!completedNodes.includes(currentId)) {
                            completedNodes.push(currentId);
                            localStorage.setItem('elegant_completed_nodes', JSON.stringify(completedNodes));
                            console.log(`✅ [URL变化] 节点${currentId}已完成，保留完成标记`);
                        }
                        const lockCount = parseInt(localStorage.getItem('elegant_chapter_lock_count') || '0') + 1;
                        localStorage.setItem('elegant_chapter_lock_count', lockCount.toString());
                        if (lockCount >= 3) {
                            console.log(`⏸️ [URL变化] 章节锁定${lockCount}次，等待30秒后重试...`);
                            localStorage.setItem('elegant_chapter_lock_count', '0');
                            setTimeout(() => engine.autoNext(), 30000);
                        } else {
                            console.log(`⏸️ [URL变化] 章节锁定${lockCount}次，等待10秒后重试...`);
                            setTimeout(() => engine.autoNext(), 10000);
                        }
                        return;
                    }
                }
                
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

    _hotreloadPending.then((shouldHotReload) => {
        if (shouldHotReload) {
            console.log('[Init] ⏸️ 热重载已触发，当前版本暂停初始化（开发版将接管）');
            return;
        }
        console.log(`[Init] ✅ 无开发服务器，使用当前版本(${ELEGANT_VERSION})`);
        init();
    }).catch(() => {
        console.log('[Init] ⚠️ 热重载检测异常，使用当前版本');
        init();
    });

})();
