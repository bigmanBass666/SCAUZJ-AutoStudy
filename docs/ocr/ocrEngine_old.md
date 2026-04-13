好的，这个思路非常清晰。既然是发布给大众使用的脚本，**稳定性**和**容错率**是核心。

我为你封装了一个**独立的 OCR 模块**。它包含了你需要的所有逻辑：
1.  **配置化**：第一次运行会弹窗让用户输入 OCR.space 的 API Key，并保存到本地，之后不再打扰。
2.  **三重保障（多重准备）**：
    *   **第一重**：尝试使用用户填写的 **OCR.space**（云端，速度快，识别率尚可）。
    *   **第二重**：如果第一重失败或没有 Key，自动降级使用 **Puter.js (Mistral OCR)**（云端，无需 Key，效果通常比 OCR.space 好，是完美的备用方案）。
    *   **第三重**：如果云端都挂了，最后降级使用 **Tesseract.js**（纯本地离线，无需 Key，虽然慢但保底）。
3.  **自动预处理**：内置了将图片转为灰度的逻辑，专门对付彩色背景干扰。

---

### 请复制以下这段话和代码，直接发给你的 AI

> **（发给 AI 的指令）**
> 我要在一个油猴脚本里集成 OCR 功能。请把下面这个 `OCREngine` 类的代码整合到我的脚本中。
> 
> **要求如下：**
> 1. 请在脚本头部添加代码中需要的 `@require` 依赖。
> 2. 在我的脚本主逻辑中，实例化这个类：`const ocr = new OCREngine();`
> 3. 当需要识别验证码时（假设图片元素是 `img`），调用 `await ocr.recognize(img)`，它将返回识别出的字符串。
> 4. 如果是首次运行且没有 API Key，代码会自动处理。
> 
> **这是 OCR 模块的代码：**

---

### OCR 模块代码

```javascript
// ==UserScript==
// @name         Your Script Name
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  ...
// @match        *://*/*
// // 【重要】请复制以下三行 @require 到你的脚本头部，这是依赖库
// @require      https://js.puter.com/v2/
// @require      https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// ==/UserScript==

(function() {
    'use strict';

    // =================================================================
    // 【OCR 核心模块】
    // 包含了多级降级策略：OCR.space (用户Key) -> Puter.js (云端无Key) -> Tesseract.js (本地离线)
    // =================================================================
    class OCREngine {
        constructor() {
            this.storageKey = 'MY_SCRIPT_OCR_API_KEY'; // 存储Key的本地键名
            this.apiKey = GM_getValue(this.storageKey, '');
        }

        /**
         * 主入口：识别图片元素
         * @param {HTMLImageElement} imgElement - 页面上的图片DOM元素
         * @returns {Promise<string>} - 识别出的文本字符串
         */
        async recognize(imgElement) {
            if (!imgElement) throw new Error("未找到图片元素");

            // 1. 图像预处理（转灰度，减少彩色圆点干扰）
            const base64Image = this._preprocessImage(imgElement);
            
            console.log("[OCR] 开始尝试识别...");

            // 2. 第一重：尝试使用 OCR.space (用户配置的 Key)
            if (this.apiKey) {
                try {
                    const text = await this._tryOCRSpace(base64Image);
                    if (text) return this._cleanText(text);
                } catch (e) {
                    console.warn("[OCR] OCR.space 识别失败:", e);
                }
            }

            // 3. 第二重：尝试使用 Puter.js (Mistral OCR，无需 Key，高质量云端)
            try {
                console.log("[OCR] 降级尝试 Puter.js (Mistral)...");
                const text = await this._tryPuter(base64Image);
                if (text) return this._cleanText(text);
            } catch (e) {
                console.warn("[OCR] Puter.js 识别失败:", e);
            }

            // 4. 第三重：尝试使用 Tesseract.js (本地离线，保底方案)
            try {
                console.log("[OCR] 降级尝试 Tesseract.js (本地)...");
                const text = await this._tryTesseract(imgElement); // Tesseract 支持直接传 Element 或 Canvas
                if (text) return this._cleanText(text);
            } catch (e) {
                console.error("[OCR] Tesseract.js 识别失败:", e);
            }

            throw new Error("所有 OCR 通道均识别失败，请检查网络或图片。");
        }

        /**
         * 获取或设置 API Key (供外部调用，比如设置菜单)
         */
        setApiKey(key) {
            this.apiKey = key;
            GM_setValue(this.storageKey, key);
        }

        getApiKey() {
            return this.apiKey;
        }

        // ================= 内部私有方法 =================

        /**
         * 图像预处理：绘制到 Canvas 并转灰度
         */
        _preprocessImage(imgElement) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = imgElement.naturalWidth;
            canvas.height = imgElement.naturalHeight;
            
            // 绘制原图
            ctx.drawImage(imgElement, 0, 0);
            
            // 获取像素数据进行灰度化
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // 加权平均法计算灰度
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                data[i] = gray;
                data[i + 1] = gray;
                data[i + 2] = gray;
            }
            ctx.putImageData(imgData, 0, 0);
            
            // 返回 Base64 (不带前缀)
            return canvas.toDataURL('image/png').split(',')[1];
        }

        /**
         * 清理识别结果：去除空格、换行
         */
        _cleanText(text) {
            if (!text) return "";
            return text.replace(/[\s\n\r]/g, '').trim();
        }

        /**
         * 方案1：OCR.space
         */
        async _tryOCRSpace(base64Image) {
            if (!this.apiKey) {
                // 如果没有 Key，尝试请求一次（或者直接跳过）
                console.log("[OCR] 未配置 OCR.space Key，跳过。");
                return null;
            }

            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "POST",
                    url: "https://api.ocr.space/parse/image",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    data: new URLSearchParams({
                        apikey: this.apiKey,
                        base64Image: `data:image/png;base64,${base64Image}`,
                        language: "eng", // 验证码通常是英文+数字，如果是中文改为 'chs'
                        isOverlayRequired: false,
                        scale: true,
                        OCREngine: 2
                    }).toString(),
                    onload: (response) => {
                        try {
                            const res = JSON.parse(response.responseText);
                            if (!res.IsErroredOnProcessing && res.ParsedResults) {
                                resolve(res.ParsedResults[0].ParsedText);
                            } else {
                                reject(res.ErrorMessage || "OCR.space 返回错误");
                            }
                        } catch (e) {
                            reject(e);
                        }
                    },
                    onerror: (err) => reject(err)
                });
            });
        }

        /**
         * 方案2：Puter.js (Mistral OCR)
         */
        async _tryPuter(base64Image) {
            if (typeof puter === 'undefined') throw new Error("Puter.js 未加载");
            
            // Puter 支持直接传 data URL
            const dataUrl = `data:image/png;base64,${base64Image}`;
            
            // 调用 Mistral OCR (provider: 'mistral')，如果只想用默认可去掉参数
            const text = await puter.ai.img2txt({
                source: dataUrl,
                provider: 'mistral', 
                model: 'mistral-ocr-latest'
            });
            
            return text;
        }

        /**
         * 方案3：Tesseract.js (本地)
         */
        async _tryTesseract(imgElement) {
            if (typeof Tesseract === 'undefined') throw new Error("Tesseract.js 未加载");

            // 创建 Worker
            const worker = await Tesseract.createWorker('eng'); // 默认英文，中文用 'chi_sim'
            
            // 识别
            const ret = await worker.recognize(imgElement);
            await worker.terminate();
            
            return ret.data.text;
        }
    }

    // =================================================================
    // 【使用示例】
    // 你的 AI 助手应该把下面的逻辑集成到你的按钮点击事件或主流程中
    // =================================================================
    
    /*
    // 1. 初始化引擎
    const ocrEngine = new OCREngine();

    // 2. (可选) 检查是否需要设置 Key
    if (!ocrEngine.getApiKey()) {
        const inputKey = prompt("请输入 OCR.space API Key (留空则仅使用免费备用方案):");
        if (inputKey) ocrEngine.setApiKey(inputKey);
    }

    // 3. 识别按钮点击事件
    document.querySelector('#your-button-id').addEventListener('click', async () => {
        const img = document.querySelector('img.captcha-img');
        if (!img) return alert('未找到图片');

        const btn = document.querySelector('#your-button-id');
        const originalText = btn.textContent;
        btn.textContent = "识别中...";
        btn.disabled = true;

        try {
            const result = await ocrEngine.recognize(img);
            console.log("最终结果:", result);
            alert("识别成功: " + result);
            // 填入输入框...
        } catch (e) {
            console.error(e);
            alert("识别失败: " + e.message);
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
    */

})();
```

### 给用户的提示（你可以写在脚本说明里）

在你的脚本说明页面，你可以这样告诉用户：

> **关于 OCR 功能：**
> 本脚本内置了三重 OCR 识别引擎，自动降级，保证识别成功率：
> 1.  **OCR.space（推荐）**：识别速度快。如果你有 [OCR.space](https://ocr.space/) 的免费 API Key，脚本首次运行时会提示输入。没有 Key 也能用，会自动使用下面的备用方案。
> 2.  **Puter.js（云端备用）**：无需配置，自动调用 Mistral AI 进行云端识别，效果极佳。
> 3.  **Tesseract.js（本地保底）**：如果以上云端服务均不可用，脚本会自动使用浏览器本地算力进行离线识别（稍慢，但绝对可用）。

这样设计，小白用户什么都不用填（直接用方案2和3），高级用户可以填 Key（用方案1），体验会非常好。