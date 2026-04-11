// ==UserScript==
// @name         验证码自动识别 (OCR.space 免费 API)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  使用OCR.space免费API识别验证码，自动进行去色预处理
// @author       You
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // ================= 配置区域 =================

    // 1. 你的 OCR.space API Key (去官网 https://ocr.space/ 免费注册获取)
    const API_KEY = "你的OCR_SPACE_API_KEY";

    // 2. 验证码图片的选择器 (根据目标网站修改，例如 img#captcha, .captcha-img 等)
    // 这里是一个通用的匹配规则，你需要打开网站按F12查看验证码img标签的类名或ID
    const IMG_SELECTOR = "img[src*='captcha']"; 

    // ===========================================

    // 创建一个悬浮按钮用于触发识别（或者你可以根据逻辑自动触发）
    const btn = document.createElement('button');
    btn.textContent = "👁️ 识别验证码";
    btn.style.position = 'fixed';
    btn.style.top = '10px';
    btn.style.right = '10px';
    btn.style.zIndex = '9999';
    btn.style.padding = '10px';
    btn.style.backgroundColor = '#4CAF50';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '5px';
    btn.style.cursor = 'pointer';
    document.body.appendChild(btn);

    btn.addEventListener('click', () => {
        const img = document.querySelector(IMG_SELECTOR);
        if (!img) {
            alert("未找到验证码图片，请修改脚本中的 IMG_SELECTOR");
            return;
        }
        processAndRecognize(img);
    });

    /**
     * 主处理函数：预处理图片 -> 调用API -> 填入结果
     */
    function processAndRecognize(imgElement) {
        console.log("开始处理验证码...");

        // 1. 将图片绘制到 Canvas 进行灰度处理（去色，减少彩色圆点干扰）
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 确保图片加载完成
        if (!imgElement.complete) {
            imgElement.onload = () => startProcess();
        } else {
            startProcess();
        }

        function startProcess() {
            canvas.width = imgElement.naturalWidth;
            canvas.height = imgElement.naturalHeight;
            
            // 绘制原图
            ctx.drawImage(imgElement, 0, 0);
            
            // 获取像素数据
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;

            // 遍历像素进行灰度化 (加权平均法)
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // 计算灰度值
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                data[i] = gray;     // R
                data[i + 1] = gray; // G
                data[i + 2] = gray; // B
                // Alpha (data[i+3]) 保持不变
            }
            
            // 将处理后的数据放回 Canvas
            ctx.putImageData(imgData, 0, 0);

            // 2. 将 Canvas 内容转为 Base64
            const base64Image = canvas.toDataURL('image/png').split(',')[1]; // 去掉 data:image/png;base64, 前缀

            // 3. 调用 OCR.space API
            callOCRAPI(base64Image);
        }
    }

    /**
     * 调用 OCR.space API
     * 使用 GM_xmlhttpRequest 绕过跨域限制
     */
    function callOCRAPI(base64Image) {
        const apiUrl = "https://api.ocr.space/parse/image";

        GM_xmlhttpRequest({
            method: "POST",
            url: apiUrl,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data: new URLSearchParams({
                apikey: API_KEY,
                base64Image: `data:image/png;base64,${base64Image}`,
                language: "chs", // 如果是纯英文数字，改成 "eng" 效果更好
                isOverlayRequired: false,
                scale: true, // 自动放大
                detectOrientation: true,
                OCREngine: 2 // 引擎2对数字和特殊字符支持较好
            }).toString(),
            onload: function(response) {
                try {
                    const res = JSON.parse(response.responseText);
                    if (res.IsErroredOnProcessing) {
                        console.error("OCR Error:", res.ErrorMessage);
                        alert("识别失败: " + res.ErrorMessage);
                        return;
                    }
                    
                    const rawText = res.ParsedResults[0].ParsedText;
                    // 清理结果（去除空格、换行）
                    const cleanText = rawText.replace(/[\s\n\r]/g, '');
                    
                    console.log("识别结果:", cleanText);
                    alert("识别结果: " + cleanText);

                    // TODO: 在这里把结果填入输入框
                    // const input = document.querySelector('#captcha_input');
                    // if(input) input.value = cleanText;

                } catch (e) {
                    console.error("解析响应失败", e);
                }
            },
            onerror: function(err) {
                console.error("请求失败", err);
            }
        });
    }

})();