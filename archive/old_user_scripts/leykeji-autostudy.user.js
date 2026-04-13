// ==UserScript==
// @name         乐益科技全自动无痕刷课脚本
// @namespace    http://tampermonkey.net/
// @version      2.5.0
// @description  全自动无痕并行刷课 - 模拟真人行为特征，绕过防刷课检测
// @author       SecurityAudit
// @match        https://*.leykeji.com/*
// @match        https://leykeji.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @connect      *
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ===================== 配置区 =====================
    const CONFIG = {
        // 时间间隔配置（毫秒）- 模拟真人节奏
        STUDY_SUBMIT_INTERVAL: 30000,    // 学习时长上报间隔（30秒，与原生一致）
        STUDY_TIME_INCREMENT: 28,        // 每次上报增加的秒数（略少于30秒模拟自然偏差）
        NODE_SWITCH_DELAY: 5000,         // 切换节点延迟
        CAPTCHA_RETRY_DELAY: 2000,       // 验证码重试延迟
        LOGIN_RETRY_DELAY: 3000,         // 登录重试延迟

        // 并行课程数
        MAX_PARALLEL_COURSES: 2,         // 最大并行课程数（避免过于明显）

        // 行为模拟
        MOUSE_MOVE_ENABLED: true,        // 是否模拟鼠标移动
        MOUSE_MOVE_INTERVAL: 3000,       // 鼠标移动间隔
        RANDOM_PAUSE_ENABLED: true,      // 是否随机暂停（模拟离开）
        RANDOM_PAUSE_CHANCE: 0.03,       // 随机暂停概率
        RANDOM_PAUSE_DURATION: [5000, 15000], // 随机暂停时长范围

        // 防检测
        ANTI_DETECT_ENABLED: true,       // 启用防检测
        SPOOF_LOCALSTORAGE: true,        // 伪造localStorage播放记录
        HOOK_CONSOLE_LOG: true,          // 钩取console.log防止泄露

        // 验证码自动识别（使用外部OCR API）
        CAPTCHA_OCR_ENABLED: true,       // 启用验证码自动识别

        // 智谱 AI 多模态 OCR
        ZHIPU_API_KEY: '',       // GLM-4V-Flash API Key（留空使用内置识别）
        // 日志
        DEBUG: false,                    // 调试模式
    };

    // ===================== 工具函数 =====================
    const Utils = {
        // 随机整数
        randomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        // 随机浮点数
        randomFloat(min, max) {
            return Math.random() * (max - min) + min;
        },

        // 带抖动的延迟
        delay(ms, jitter = 0.1) {
            const actual = ms * (1 + Utils.randomFloat(-jitter, jitter));
            return new Promise(resolve => setTimeout(resolve, actual));
        },

        // 日志
        log(level, ...args) {
            const prefix = '[自动刷课]';
            const time = new Date().toLocaleTimeString();
            if (level === 'debug' && !CONFIG.DEBUG) return;
            console.log(`${prefix}[${time}][${level}]`, ...args);
        },

        // 安全的fetch请求（带重试）
        async safeFetch(url, options, retries = 3) {
            for (let i = 0; i < retries; i++) {
                try {
                    const resp = await fetch(url, {
                        ...options,
                        credentials: 'same-origin',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                            ...options.headers
                        }
                    });
                    if (resp.ok) return resp;
                    if (resp.status >= 400 && resp.status < 500) throw new Error(`HTTP ${resp.status}`);
                    await Utils.delay(2000);
                } catch (e) {
                    if (i === retries - 1) throw e;
                    await Utils.delay(1000 * (i + 1));
                }
            }
        }
    };

    // ===================== 反检测模块 =====================
    const AntiDetect = {
        init() {
            if (!CONFIG.ANTI_DETECT_ENABLED) return;

            // 1. 伪造 localStorage 播放记录（让系统认为是在正常播放）
            if (CONFIG.SPOOF_LOCALSTORAGE) {
                this.setupLocalStorageSpoof();
            }

            // 2. 钩取 console.log 移除警告信息
            if (CONFIG.HOOK_CONSOLE_LOG) {
                this.hookConsoleLog();
            }

            // 3. 拦截并伪造鼠标移动事件
            if (CONFIG.MOUSE_MOVE_ENABLED) {
                this.setupMouseSimulation();
            }

            // 4. 伪造页面可见性（防止切换标签页被检测）
            this.hookVisibilityAPI();

            // 5. 伪造窗口焦点
            this.hookFocusEvents();

            Utils.log('info', '反检测模块已初始化');
        },

        setupLocalStorageSpoof() {
            // 获取当前用户信息
            const schoolId = document.getElementById('school-id')?.value || '0';
            const userId = document.getElementById('user-id')?.value || '0';
            const nodeId = document.getElementById('video-nodeId')?.value || '';

            if (schoolId && userId && nodeId) {
                const playKey = `node_${schoolId}${userId}_${nodeId}`;
                const concurrentKey = `node_play_${schoolId}${userId}`;

                // 定期更新localStorage（模拟真实播放进度）
                setInterval(() => {
                    const video = document.querySelector('video');
                    if (video) {
                        localStorage.setItem(playKey, Math.floor(video.currentTime));
                    }
                    localStorage.setItem(concurrentKey, nodeId);
                }, 567);  // 与原生间隔一致
            }
        },

        hookConsoleLog() {
            // 过滤掉可疑的console.log输出
            const origLog = console.log;
            console.log = function(...args) {
                const msg = args.join(' ');
                // 过滤包含"刷课"、"作弊"、"警告"等关键词的日志
                if (msg.includes('刷课') || msg.includes('作弊') || msg.includes('警告')) {
                    return; // 静默忽略
                }
                origLog.apply(console, args);
            };
        },

        setupMouseSimulation() {
            // 生成自然的鼠标移动轨迹
            let mouseX = 400, mouseY = 300;
            let targetX = 400, targetY = 300;

            setInterval(() => {
                // 每隔一段时间选择新的目标位置
                targetX = Utils.randomInt(100, 800);
                targetY = Utils.randomInt(100, 500);
            }, CONFIG.MOUSE_MOVE_INTERVAL);

            // 平滑移动鼠标
            setInterval(() => {
                mouseX += (targetX - mouseX) * 0.1 + Utils.randomInt(-5, 5);
                mouseY += (targetY - mouseY) * 0.1 + Utils.randomInt(-5, 5);

                const videoContent = document.getElementById('videoContent');
                if (videoContent) {
                    const ofs = videoContent.getBoundingClientRect();
                    const x = Math.round(mouseX - ofs.left);
                    const y = Math.round(mouseY - ofs.top);
                    const t = new Date().getTime() % 20000;

                    // 直接触发mousemove事件（添加到原生xlogs数组）
                    const event = new MouseEvent('mousemove', {
                        clientX: mouseX,
                        clientY: mouseY,
                        bubbles: true
                    });
                    document.body.dispatchEvent(event);
                }
            }, 200);
        },

        hookVisibilityAPI() {
            // 让页面始终看起来是可见的
            Object.defineProperty(document, 'visibilityState', {
                get: () => 'visible',
                configurable: true
            });
            Object.defineProperty(document, 'hidden', {
                get: () => false,
                configurable: true
            });

            // 阻止visibilitychange事件
            document.addEventListener('visibilitychange', e => {
                e.stopImmediatePropagation();
            }, true);
        },

        hookFocusEvents() {
            // 让窗口始终看起来有焦点
            window.addEventListener('blur', e => {
                e.stopImmediatePropagation();
            }, true);
            window.addEventListener('focus', e => {
                e.stopImmediatePropagation();
            }, true);
        }
    };

    // ===================== 验证码识别模块 =====================
    const CaptchaSolver = {
        // 识别登录页验证码
        async solveLoginCaptcha() {
            try {
                const codeImg = document.getElementById('codeImg');
                if (!codeImg) return null;

                // 获取验证码图片
                const resp = await fetch(codeImg.src);
                const blob = await resp.blob();
                const base64 = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });

                // 使用Canvas识别（简易OCR）
                const code = await this.ocrCaptcha(base64);
                Utils.log('info', '登录验证码识别结果:', code);
                return code;
            } catch (e) {
                Utils.log('error', '验证码识别失败:', e);
                return null;
            }
        },

        // 识别学习中的验证码
        async solveStudyCaptcha() {
            try {
                // 获取学习验证码图片
                const imgCode = document.querySelector('img[src*="/service/code/aa"]') ||
                               document.querySelector('img[src*="/service/code?"]');

                if (!imgCode) return null;

                const resp = await fetch(imgCode.src);
                const blob = await resp.blob();
                const base64 = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });

                const code = await this.ocrCaptcha(base64);
                Utils.log('info', '学习验证码识别结果:', code);
                return code;
            } catch (e) {
                Utils.log('error', '学习验证码识别失败:', e);
                return null;
            }
        },

        // OCR识别验证码（Canvas方式）
        async ocrCaptcha(base64Data) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    // 简单的图像处理和字符分割
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const chars = this.segmentAndRecognize(imageData, canvas.width, canvas.height);
                    resolve(chars || '');
                };
                img.onerror = () => resolve('');
                img.src = base64Data;
            });
        },

        // 简化的验证码字符分割和识别
        segmentAndRecognize(imageData, width, height) {
            // 注意：实际场景中，可以使用外部OCR API
            // 这里使用简化版本 - 实际使用时建议接入第三方OCR
            // 或者使用GM_xmlhttpRequest调用外部识别服务

            // 简易处理：灰度化+二值化
            const data = imageData.data;
            const gray = [];
            for (let i = 0; i < data.length; i += 4) {
                gray.push(data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
            }

            // 二值化
            const binary = gray.map(g => g < 128 ? 1 : 0);

            // 垂直投影分割字符
            const projection = [];
            for (let x = 0; x < width; x++) {
                let count = 0;
                for (let y = 0; y < height; y++) {
                    count += binary[y * width + x];
                }
                projection.push(count);
            }

            // 找到字符边界
            const segments = [];
            let inChar = false;
            let start = 0;
            for (let x = 0; x < width; x++) {
                if (projection[x] > 2 && !inChar) {
                    inChar = true;
                    start = x;
                } else if (projection[x] <= 2 && inChar) {
                    inChar = false;
                    if (x - start > 5) {
                        segments.push([start, x]);
                    }
                }
            }
            if (inChar && width - start > 5) {
                segments.push([start, width]);
            }

            // 提取每个字符的特征并与预存模板匹配
            // 由于是简化版本，这里返回提示信息
            // 在实际使用中，建议接入以下方案之一：
            // 1. 使用第三方OCR API（如百度OCR、腾讯OCR）
            // 2. 使用TensorFlow.js加载预训练模型
            // 3. 使用GM_xmlhttpRequest发送到自建OCR服务
            Utils.log('debug', `检测到${segments.length}个字符区域`);

            // 对于实际使用，这里调用外部OCR
            return this.callExternalOCR(imageData, width, height);
        },
        async callExternalOCR(imageData, width, height) {
            const apiKey = GM_getValue('zhipu_api_key', '');
            if (!apiKey) {
                Utils.log('debug', '未配置智谱 API Key，跳过 OCR 识别');
                return '';
            }
            
            try {
                // 准备 base64 图片数据
                let base64 = imageData;
                
                // 如果 imageData 是 ImageData/Uint8ClampedArray，需要 canvas 转换
                if (imageData instanceof Uint8ClampedArray || 
                    (imageData.data && imageData.data instanceof Uint8ClampedArray)) {
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.putImageData(new ImageData(imageData, width, height), 0, 0);
                    base64 = canvas.toDataURL('image/jpeg', 0.8).replace(/^data:image\/\w+;base64,/, '');
                } else if (typeof imageData === 'string' && imageData.startsWith('data:')) {
                    base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
                } else if (typeof imageData === 'object' && imageData.data) {
                    // 处理 CanvasImageSource 等情况
                    const canvas = document.createElement('canvas');
                    canvas.width = width || imageData.width;
                    canvas.height = height || imageData.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(imageData, 0, 0);
                    base64 = canvas.toDataURL('image/jpeg', 0.8).replace(/^data:image\/\w+;base64,/, '');
                }
                
                if (!base64) {
                    Utils.log('warn', '无法提取图片 base64 数据');
                    return '';
                }
                
                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'POST',
                        url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        data: JSON.stringify({
                            model: 'glm-4v-flash',
                            messages: [
                                {
                                    role: 'user',
                                    content: [
                                        {
                                            type: 'text',
                                            text: '识别图中所有文字（特别是验证码字符），只返回原始文字内容，不要额外解释或标点：'
                                        },
                                        {
                                            type: 'image_url',
                                            image_url: {
                                                url: `data:image/jpeg;base64,${base64}`
                                            }
                                        }
                                    ]
                                }
                            ],
                            temperature: 0.1,
                            max_tokens: 200,
                            stream: false
                        }),
                        onload: resolve,
                        onerror: reject,
                        timeout: 10000  // 10秒超时
                    });
                });
                
                const result = JSON.parse(response.responseText);
                if (result.error) {
                    Utils.log('error', '智谱 API 错误:', result.error.message || result.error);
                    return '';
                }
                const text = result.choices?.[0]?.message?.content || '';
                Utils.log('debug', 'GLM-4V-Flash 识别结果:', text.trim());
                return text.trim();
                
            } catch (e) {
                Utils.log('error', 'GLM-4V-Flash OCR 失败:', e);
                return '';
            }
        }
    };
    // ===================== 学习核心模块 =====================
    const StudyEngine = {
        studyId: 0,
        totalTime: 0,
        studyTime: 0,
        isRunning: false,
        currentNodeId: null,
        currentNodeTitle: '',
        videoDuration: 0,
        timerRef: null,
        submitTimerRef: null,

        // 初始化学习引擎
        init() {
            const nodeId = document.getElementById('video-nodeId')?.value;
            const userId = document.getElementById('user-id')?.value;
            const schoolId = document.getElementById('school-id')?.value;
            const studyState = parseInt(document.getElementById('study-state')?.value || '0');

            if (!nodeId) {
                Utils.log('error', '未找到节点ID，不在学习页面');
                return false;
            }

            this.currentNodeId = nodeId;
            Utils.log('info', `学习引擎初始化 - 节点: ${nodeId}, 用户: ${userId}, 学校: ${schoolId}, 学习状态: ${studyState}`);

            // 如果已完成，跳过
            if (studyState === 2) {
                Utils.log('info', '该节点已完成学习');
                return false;
            }

            return true;
        },

        // 开始自动学习当前节点
        async start() {
            if (this.isRunning) return;
            this.isRunning = true;

            Utils.log('info', '🚀 开始自动学习...');

            // 1. 发送初始学习请求
            await this.submitStudyTime(1);

            // 2. 模拟视频播放进度
            const video = document.querySelector('video');
            if (video) {
                this.videoDuration = video.duration;
                Utils.log('info', `视频时长: ${Math.floor(this.videoDuration)}秒`);

                // 静音播放（避免干扰）
                video.muted = true;
                video.volume = 0;
                try { await video.play(); } catch(e) {}

                // 加速播放（2x速度，不太明显）
                video.playbackRate = 2.0;
            }

            // 3. 启动定时上报
            this.submitTimerRef = setInterval(() => {
                this.submitStudyTime();
            }, CONFIG.STUDY_SUBMIT_INTERVAL);

            // 4. 启动时间累计
            this.timerRef = setInterval(() => {
                if (this.isRunning) {
                    // 模拟自然行为：偶尔暂停
                    if (CONFIG.RANDOM_PAUSE_ENABLED && Math.random() < CONFIG.RANDOM_PAUSE_CHANCE) {
                        const pauseDuration = Utils.randomInt(
                            CONFIG.RANDOM_PAUSE_DURATION[0],
                            CONFIG.RANDOM_PAUSE_DURATION[1]
                        );
                        Utils.log('debug', `模拟离开 ${pauseDuration/1000}秒`);
                        setTimeout(() => {
                            this.totalTime += 1;
                        }, pauseDuration);
                    } else {
                        this.totalTime += 1;
                    }

                    // 同步视频进度
                    if (video && !video.paused && video.currentTime < video.duration) {
                        // 视频正常播放中
                    }
                }
            }, 1000);

            // 5. 监控视频结束
            if (video) {
                video.addEventListener('ended', () => {
                    Utils.log('info', '✅ 视频播放完成');
                    this.onNodeComplete();
                });
            }

            // 6. 监听验证码需求
            this.monitorCaptchaNeeds();
        },

        // 提交学习时间
        async submitStudyTime(force = 0, code = '') {
            this.studyTime = this.totalTime;
            const data = {
                nodeId: this.currentNodeId,
                studyId: this.studyId,
                studyTime: this.totalTime
            };

            if (code) {
                data.code = code;
            }
            if (force === 1 && this.totalTime < 1) {
                data.studyTime = 1;
            }

            try {
                const resp = await Utils.safeFetch('/user/node/study', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: Object.entries(data).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&')
                });

                const ret = await resp.json();

                if (ret.status) {
                    if (ret.state === 1) {
                        Utils.log('warn', '学习记录出现问题');
                    } else {
                        this.studyId = ret.studyId;
                        if (code) {
                            Utils.log('info', '✅ 验证码验证成功，继续学习');
                        }
                    }
                    Utils.log('debug', `学习时间已上报: ${this.totalTime}秒, studyId: ${this.studyId}`);
                } else {
                    // 需要验证码
                    if (ret.need_code === 1) {
                        Utils.log('info', '⚠️ 触发验证码（简单验证码）');
                        await this.handleSimpleCaptcha();
                    } else if (ret.need_code === 2) {
                        Utils.log('info', '⚠️ 触发验证码（图片点击验证码）');
                        await this.handleImageCaptcha(ret.verifyToken);
                    } else {
                        Utils.log('warn', '学习时间提交失败:', ret.msg);
                    }
                }
            } catch (e) {
                Utils.log('error', '学习时间提交异常:', e);
            }
        },

        // 处理简单文字验证码
        async handleSimpleCaptcha() {
            const code = await CaptchaSolver.solveStudyCaptcha();
            if (code) {
                await this.submitStudyTime(1, code);
            } else {
                // 自动识别失败，刷新验证码重试
                const imgs = document.querySelectorAll('img[src*="/service/code"]');
                imgs.forEach(img => {
                    img.src = '/service/code?r=' + Math.random();
                    if (img.src.includes('/service/code?')) {
                        img.src = '/service/code/aa?r=' + Math.random();
                    }
                });
                await Utils.delay(CONFIG.CAPTCHA_RETRY_DELAY);
                const retryCode = await CaptchaSolver.solveStudyCaptcha();
                if (retryCode) {
                    await this.submitStudyTime(1, retryCode);
                }
            }
        },

        // 处理图片点击验证码
        async handleImageCaptcha(verifyToken) {
            // 图片点击验证码需要调用第三方服务
            // 这里使用dunclick API的逆向
            Utils.log('info', '正在处理图片点击验证码...');
            // 预留：接入第三方验证码解决方案
        },

        // 节点完成
        onNodeComplete() {
            this.stop();
            Utils.log('info', `✅ 节点 ${this.currentNodeId} 学习完成`);
        },

        // 停止学习
        stop() {
            this.isRunning = false;
            if (this.timerRef) clearInterval(this.timerRef);
            if (this.submitTimerRef) clearInterval(this.submitTimerRef);

            // 发送关闭信号
            const form = new FormData();
            form.append('nodeId', this.currentNodeId);
            form.append('studyId', this.studyId);
            form.append('studyTime', this.totalTime);
            form.append('close', '1');
            navigator.sendBeacon('/user/node/study', form);
        },

        // 监控验证码需求
        monitorCaptchaNeeds() {
            // 监听页面上弹出的验证码弹窗
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            // 检查是否有验证码弹窗
                            const captchaInput = node.querySelector?.('#yzCode') ||
                                                node.querySelector?.('input[placeholder*="验证码"]');
                            if (captchaInput) {
                                Utils.log('info', '检测到验证码弹窗');
                                this.handleCaptchaPopup(node);
                            }
                        }
                    });
                });
            });

            observer.observe(document.body, { childList: true, subtree: true });
        },

        // 处理验证码弹窗
        async handleCaptchaPopup(popupNode) {
            const code = await CaptchaSolver.solveStudyCaptcha();
            if (code) {
                const input = popupNode.querySelector('input[placeholder*="验证码"]');
                if (input) {
                    input.value = code;
                    // 触发input事件
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));

                    // 点击确认按钮
                    await Utils.delay(500);
                    const confirmBtn = popupNode.querySelector('.layui-layer-btn0') ||
                                      document.querySelector('.layui-layer-btn0');
                    if (confirmBtn) confirmBtn.click();
                }
            }
        }
    };

    // ===================== 课程管理模块 =====================
    const CourseManager = {
        courses: [],
        currentNodeIndex: 0,
        courseNodes: [],

        // 获取所有课程
        async fetchCourses() {
            try {
                const resp = await Utils.safeFetch('/user', {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                const html = await resp.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // 解析课程列表
                const courseLinks = doc.querySelectorAll('a[href*="courseId"]');
                const courses = [];
                courseLinks.forEach(a => {
                    const match = a.href.match(/courseId=(\d+)/);
                    if (match) {
                        courses.push({
                            courseId: match[1],
                            name: a.textContent.trim(),
                            url: a.href
                        });
                    }
                });

                this.courses = [...new Map(courses.map(c => [c.courseId, c])).values()];
                Utils.log('info', `发现 ${this.courses.length} 门课程`);
                return this.courses;
            } catch (e) {
                Utils.log('error', '获取课程列表失败:', e);
                return [];
            }
        },

        // 获取课程所有节点
        async fetchCourseNodes(courseId) {
            try {
                const resp = await Utils.safeFetch(`/user/course?courseId=${courseId}`, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                const html = await resp.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                const nodeLinks = doc.querySelectorAll('a[href*="nodeId"]');
                const nodes = [];
                const seen = new Set();
                nodeLinks.forEach(a => {
                    const match = a.href.match(/nodeId=(\d+)/);
                    if (match && !seen.has(match[1])) {
                        seen.add(match[1]);
                        nodes.push({
                            nodeId: match[1],
                            name: a.textContent.trim(),
                            url: a.href
                        });
                    }
                });

                Utils.log('info', `课程 ${courseId} 共有 ${nodes.length} 个学习节点`);
                return nodes;
            } catch (e) {
                Utils.log('error', '获取课程节点失败:', e);
                return [];
            }
        },

        // 批量刷课 - 自动遍历所有节点
        async autoStudyAll(courseId) {
            const nodes = await this.fetchCourseNodes(courseId);
            if (nodes.length === 0) {
                Utils.log('error', '未找到学习节点');
                return;
            }

            Utils.log('info', `开始自动刷课，共 ${nodes.length} 个节点`);

            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                Utils.log('info', `[${i+1}/${nodes.length}] 正在学习: ${node.name}`);

                // 导航到节点页面
                window.location.href = node.url;
                await Utils.delay(5000);

                // 等待页面加载完成
                await this.waitForVideoLoad();

                // 开始学习
                if (StudyEngine.init()) {
                    await StudyEngine.start();
                    // 等待学习完成
                    while (StudyEngine.isRunning) {
                        await Utils.delay(10000);
                    }
                }

                // 节点间延迟
                await Utils.delay(CONFIG.NODE_SWITCH_DELAY);
            }

            Utils.log('info', '🎉 所有节点学习完成！');
        },

        // 等待视频加载
        async waitForVideoLoad() {
            return new Promise(resolve => {
                const check = setInterval(() => {
                    const video = document.querySelector('video');
                    if (video && video.duration > 0) {
                        clearInterval(check);
                        resolve();
                    }
                }, 1000);

                // 超时30秒
                setTimeout(() => {
                    clearInterval(check);
                    resolve();
                }, 30000);
            });
        }
    };

    // ===================== 并行刷课模块 =====================
    const ParallelStudy = {
        workers: [],  // iframe工作线程

        // 在多个iframe中并行刷课
        async startParallel(courseIds) {
            Utils.log('info', `启动并行刷课，课程数: ${courseIds.length}`);

            for (let i = 0; i < Math.min(courseIds.length, CONFIG.MAX_PARALLEL_COURSES); i++) {
                const courseId = courseIds[i];
                await this.createWorker(courseId, i);
                await Utils.delay(3000); // 错开启动时间
            }
        },

        // 创建iframe工作线程
        async createWorker(courseId, index) {
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1280px;height:720px;border:none;';
            iframe.id = `study-worker-${index}`;
            document.body.appendChild(iframe);

            iframe.src = `/user/course?courseId=${courseId}`;
            this.workers.push({ iframe, courseId, index });

            Utils.log('info', `工作线程 ${index} 已创建 - 课程 ${courseId}`);
        },

        // 停止所有并行任务
        stopAll() {
            this.workers.forEach(w => {
                w.iframe.remove();
            });
            this.workers = [];
            Utils.log('info', '所有并行任务已停止');
        }
    };

    // ===================== 控制面板 =====================
    const ControlPanel = {
        isVisible: false,

        create() {
            // 注入样式
            GM_addStyle(`
                #auto-study-panel {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    width: 380px;
                    max-height: 90vh;
                    background: rgba(20, 20, 35, 0.97);
                    border: 1px solid rgba(100, 100, 255, 0.3);
                    border-radius: 12px;
                    z-index: 999999;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    color: #e0e0e0;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                    overflow: hidden;
                    display: none;
                }
                #auto-study-panel.show { display: block; }
                #auto-study-panel .panel-header {
                    padding: 12px 16px;
                    background: linear-gradient(135deg, #1a1a2e, #16213e);
                    border-bottom: 1px solid rgba(100, 100, 255, 0.2);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                #auto-study-panel .panel-header h3 {
                    margin: 0;
                    font-size: 15px;
                    color: #a0a0ff;
                    font-weight: 600;
                }
                #auto-study-panel .panel-body {
                    padding: 12px 16px;
                    max-height: 70vh;
                    overflow-y: auto;
                }
                #auto-study-panel .panel-body::-webkit-scrollbar { width: 4px; }
                #auto-study-panel .panel-body::-webkit-scrollbar-thumb { background: #444; border-radius: 2px; }
                #auto-study-panel .btn-row {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 10px;
                    flex-wrap: wrap;
                }
                #auto-study-panel button {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    transition: all 0.2s;
                }
                #auto-study-panel button:hover { transform: translateY(-1px); }
                #auto-study-panel .btn-start {
                    background: linear-gradient(135deg, #00b894, #00cec9);
                    color: #fff;
                }
                #auto-study-panel .btn-stop {
                    background: linear-gradient(135deg, #e17055, #d63031);
                    color: #fff;
                }
                #auto-study-panel .btn-config {
                    background: linear-gradient(135deg, #6c5ce7, #a29bfe);
                    color: #fff;
                }
                #auto-study-panel .btn-scan {
                    background: linear-gradient(135deg, #fdcb6e, #f39c12);
                    color: #333;
                }
                #auto-study-panel .status-box {
                    background: rgba(0,0,0,0.3);
                    border-radius: 8px;
                    padding: 10px 12px;
                    margin-bottom: 10px;
                    font-size: 12px;
                    line-height: 1.8;
                }
                #auto-study-panel .status-label { color: #888; }
                #auto-study-panel .status-value { color: #00ff88; font-weight: 600; }
                #auto-study-panel .log-box {
                    background: rgba(0,0,0,0.3);
                    border-radius: 8px;
                    padding: 10px 12px;
                    max-height: 200px;
                    overflow-y: auto;
                    font-size: 11px;
                    font-family: "Consolas", "Monaco", monospace;
                    line-height: 1.6;
                }
                #auto-study-panel .log-box::-webkit-scrollbar { width: 3px; }
                #auto-study-panel .log-box::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
                #auto-study-panel .log-entry-info { color: #74b9ff; }
                #auto-study-panel .log-entry-warn { color: #ffeaa7; }
                #auto-study-panel .log-entry-error { color: #ff7675; }
                #auto-study-panel .log-entry-success { color: #55efc4; }
                #auto-study-panel .close-btn {
                    background: none;
                    border: none;
                    color: #888;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 0 4px;
                }
                #auto-study-panel .close-btn:hover { color: #fff; }
                #auto-study-panel .course-list {
                    margin-top: 8px;
                }
                #auto-study-panel .course-item {
                    display: flex;
                    align-items: center;
                    padding: 6px 8px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 6px;
                    margin-bottom: 4px;
                    font-size: 12px;
                }
                #auto-study-panel .course-item input[type="checkbox"] {
                    margin-right: 8px;
                }
                #auto-study-toggle {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #6c5ce7, #a29bfe);
                    border: none;
                    color: #fff;
                    font-size: 20px;
                    cursor: pointer;
                    z-index: 999998;
                    box-shadow: 0 4px 12px rgba(108, 92, 231, 0.4);
                    transition: transform 0.2s;
                }
                #auto-study-toggle:hover { transform: scale(1.1); }
            `);

            // 创建浮动按钮
            const toggle = document.createElement('button');
            toggle.id = 'auto-study-toggle';
            toggle.textContent = '⚡';
            toggle.title = '自动刷课控制面板';
            toggle.onclick = () => this.toggle();
            document.body.appendChild(toggle);

            // 创建面板
            const panel = document.createElement('div');
            panel.id = 'auto-study-panel';
            panel.innerHTML = `
                <div class="panel-header">
                    <h3>⚡ 自动刷课控制台</h3>
                    <button class="close-btn" onclick="document.getElementById('auto-study-panel').classList.remove('show')">×</button>
                </div>
                <div class="panel-body">
                    <div class="btn-row">
                        <button class="btn-start" id="btn-start">▶ 开始学习</button>
                        <button class="btn-stop" id="btn-stop">⏹ 停止</button>
                        <button class="btn-scan" id="btn-scan">🔍 扫描课程</button>
                        <button class="btn-config" id="btn-config">⚙ 设置</button>
                    </div>

                    <div class="status-box" id="status-box">
                        <div><span class="status-label">状态：</span><span class="status-value" id="st-state">待机</span></div>
                        <div><span class="status-label">当前节点：</span><span class="status-value" id="st-node">-</span></div>
                        <div><span class="status-label">学习时长：</span><span class="status-value" id="st-time">0秒</span></div>
                        <div><span class="status-label">studyId：</span><span class="status-value" id="st-sid">-</span></div>
                        <div><span class="status-label">视频进度：</span><span class="status-value" id="st-progress">0%</span></div>
                    </div>

                    <div class="course-list" id="course-list"></div>

                    <div class="log-box" id="log-box">
                        <div class="log-entry-info">[系统] 脚本已加载，等待操作...</div>
                    </div>
                </div>
            `;
            document.body.appendChild(panel);

            // 绑定事件
            document.getElementById('btn-start').onclick = () => this.startStudy();
            document.getElementById('btn-stop').onclick = () => this.stopStudy();
            document.getElementById('btn-scan').onclick = () => this.scanCourses();
            document.getElementById('btn-config').onclick = () => this.showConfig();

            // 启动状态更新
            setInterval(() => this.updateStatus(), 1000);
        },

        toggle() {
            const panel = document.getElementById('auto-study-panel');
            this.isVisible = !this.isVisible;
            panel.classList.toggle('show', this.isVisible);
        },

        addLog(msg, level = 'info') {
            const box = document.getElementById('log-box');
            if (!box) return;
            const time = new Date().toLocaleTimeString();
            const entry = document.createElement('div');
            entry.className = `log-entry-${level}`;
            entry.textContent = `[${time}] ${msg}`;
            box.appendChild(entry);
            box.scrollTop = box.scrollHeight;

            // 最多保留100条日志
            while (box.children.length > 100) {
                box.removeChild(box.firstChild);
            }
        },

        updateStatus() {
            const stState = document.getElementById('st-state');
            const stNode = document.getElementById('st-node');
            const stTime = document.getElementById('st-time');
            const stSid = document.getElementById('st-sid');
            const stProgress = document.getElementById('st-progress');

            if (!stState) return;

            stState.textContent = StudyEngine.isRunning ? '学习中' : '待机';
            stNode.textContent = StudyEngine.currentNodeId || '-';
            stTime.textContent = `${StudyEngine.totalTime}秒`;
            stSid.textContent = StudyEngine.studyId || '-';

            const video = document.querySelector('video');
            if (video && video.duration > 0) {
                const progress = Math.min(100, Math.round(video.currentTime / video.duration * 100));
                stProgress.textContent = `${progress}%`;
            }
        },

        async startStudy() {
            this.addLog('开始自动学习...', 'success');
            AntiDetect.init();
            if (StudyEngine.init()) {
                await StudyEngine.start();
            }
        },

        stopStudy() {
            StudyEngine.stop();
            this.addLog('已停止学习', 'warn');
        },

        async scanCourses() {
            this.addLog('正在扫描课程...', 'info');
            const courses = await CourseManager.fetchCourses();
            const listEl = document.getElementById('course-list');
            if (listEl) {
                listEl.innerHTML = courses.map(c => `
                    <div class="course-item">
                        <input type="checkbox" value="${c.courseId}" checked>
                        <span>${c.name} (${c.courseId})</span>
                    </div>
                `).join('');
            }
            this.addLog(`发现 ${courses.length} 门课程`, 'success');
        },

        showConfig() {
            // 智谱 API Key 配置
            const apiKey = prompt('智谱 GLM-4V-Flash API Key（留空不启用）:', GM_getValue('zhipu_api_key', ''));
            if (apiKey !== null) {
                GM_setValue('zhipu_api_key', apiKey);
            }
            
            // OCR API 地址（保留兼容）
            const ocrUrl = prompt('备用 OCR API 地址（可选，留空使用智谱）:', GM_getValue('ocr_api_url', ''));
            if (ocrUrl !== null) {
                GM_setValue('ocr_api_url', ocrUrl);
            }
        }
    };

    // ===================== 自动登录模块 =====================
    const AutoLogin = {
        async login(username, password) {
            if (!username || !password) {
                Utils.log('error', '请提供用户名和密码');
                return false;
            }

            // 检查是否已在登录页
            if (!window.location.pathname.includes('/user/login')) {
                Utils.log('info', '不在登录页面');
                return false;
            }

            // 填写用户名密码
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            if (usernameInput) usernameInput.value = username;
            if (passwordInput) passwordInput.value = password;

            // 获取验证码并识别
            const captchaCode = await CaptchaSolver.solveLoginCaptcha();
            if (captchaCode) {
                const codeInput = document.getElementById('code');
                if (codeInput) codeInput.value = captchaCode;
            }

            // 勾选记住登录
            const remember = document.getElementById('remember');
            if (remember) remember.checked = true;

            // 提交登录
            await Utils.delay(500);

            try {
                const resp = await Utils.safeFetch('/user/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&code=${captchaCode || ''}&redirect=`
                });
                const ret = await resp.json();

                if (ret.status) {
                    Utils.log('info', '✅ 登录成功！');
                    window.location.href = ret.back || '/user';
                    return true;
                } else {
                    Utils.log('warn', '登录失败:', ret.msg);
                    if (ret.refresh_code) {
                        // 刷新验证码重试
                        await Utils.delay(CONFIG.LOGIN_RETRY_DELAY);
                        return this.login(username, password);
                    }
                    return false;
                }
            } catch (e) {
                Utils.log('error', '登录请求失败:', e);
                return false;
            }
        }
    };

    // ===================== 主入口 =====================
    function main() {
        const currentPath = window.location.pathname;

        Utils.log('info', '脚本已加载');

        // 创建控制面板
        ControlPanel.create();

        // 根据页面类型自动执行
        if (currentPath.includes('/user/node') && currentPath.includes('nodeId')) {
            // 学习页面 - 检查是否有视频
            const video = document.querySelector('video');
            if (video) {
                Utils.log('info', '检测到视频学习页面');
                // 自动初始化（但不自动开始，等待用户操作）
                if (StudyEngine.init()) {
                    ControlPanel.addLog('已就绪，点击"开始学习"启动自动刷课', 'success');
                }
            }
        } else if (currentPath.includes('/user/login')) {
            // 登录页面 - 自动填充
            Utils.log('info', '检测到登录页面');

            // 保存凭证用于自动登录
            const savedUsername = GM_getValue('username', '');
            const savedPassword = GM_getValue('password', '');

            if (savedUsername && savedPassword) {
                AutoLogin.login(savedUsername, savedPassword);
            }
        } else if (currentPath === '/user' || currentPath === '/user/') {
            // 用户中心 - 可扫描课程
            Utils.log('info', '检测到用户中心页面');
        }

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+S 切换面板
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                ControlPanel.toggle();
            }
            // Ctrl+Shift+A 开始学习
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                ControlPanel.startStudy();
            }
        });
    }

    // 等待页面加载完成
    if (document.readyState === 'complete') {
        main();
    } else {
        window.addEventListener('load', main);
    }

})();
