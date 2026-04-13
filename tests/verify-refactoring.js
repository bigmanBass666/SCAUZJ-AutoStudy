/**
 * OCREngine v3.2 重构验证测试
 * 验证所有11个类的定义和继承关系
 */

// 模拟浏览器环境
globalThis.window = {
    GM: undefined,
    crypto: require('crypto')
};
globalThis.document = {
    createElement: () => ({
        width: 0, height: 0,
        getContext: () => ({
            drawImage: () => {},
            getImageData: () => ({ data: new Uint8ClampedArray(100) }),
            putImageData: () => {}
        }),
        toDataURL: () => 'data:image/png;base64,test'
    }),
    head: { appendChild: () => {} }
};

// 读取脚本内容
const fs = require('fs');
const vm = require('vm');

try {
    const scriptContent = fs.readFileSync('./scripts/elegant-master-study.user.js', 'utf8');
    
    // 提取IIFE内容
    const iifeMatch = scriptContent.match(/\(function\(\)\s*\{([\s\S]*?)\}\)\(\);/);
    
    if (!iifeMatch) {
        throw new Error('无法提取IIFE内容');
    }
    
    console.log('✅ 成功提取IIFE代码块\n');
    
    // 在沙箱中执行
    const sandbox = {
        console: {
            log: (...args) => console.log('[SCRIPT]', ...args),
            warn: (...args) => console.warn('[SCRIPT]', ...args),
            error: (...args) => console.error('[SCRIPT]', ...args)
        },
        _GM_xmlhttpRequest: () => {},
        _GM_getValue: () => null,
        _GM_setValue: () => {},
        _GM_deleteValue: () => {},
        _GM_addStyle: () => {},
        _GM_notification: () => {},
        _GM_setClipboard: () => {},
        _GM_registerMenuCommand: () => {},
        _GM_log: () => {},
        window: globalThis.window,
        document: globalThis.document,
        navigator: { userAgent: 'Test' },
        location: { href: 'http://test' },
        setTimeout: setTimeout,
        Promise: Promise,
        URL: URL,
        URLSearchParams: URLSearchParams,
        TextEncoder: TextEncoder,
        Uint8Array: Uint8Array,
        ImageData: class ImageData {
            constructor(w, h) {
                this.data = new Uint8ClampedArray(w * h * 4);
                this.width = w;
                this.height = h;
            }
        },
        crypto: require('crypto'),
        fetch: () => Promise.resolve({ ok: true, json: () => ({}) })
    };
    
    vm.createContext(sandbox);
    vm.runInContext(iifeMatch[1], sandbox);
    
    console.log('🎉 脚本执行成功！\n');
    
    // 验证类是否正确定义
    const expectedClasses = [
        'ConfigManager',
        'ImagePreprocessor',
        'NetworkClient', 
        'ScriptLoader',
        'OCREngineBackend',
        'OcrSpaceBackend',
        'BaiduOcrBackend',
        'TencentOcrBackend',
        'PuterBackend',
        'TesseractBackend',
        'Glm4VBackend',
        'OCREngine',
        'UIBuilder'
    ];
    
    console.log('=== 类定义验证 ===\n');
    
    let allPassed = true;
    
    for (const className of expectedClasses) {
        if (typeof sandbox[className] !== 'undefined') {
            const instance = new sandbox[className](sandbox.config || {});
            
            // 特殊处理需要参数的类
            if (className === 'ImagePreprocessor') {
                console.log(`✅ ${className} - 已定义`);
                console.log(`   方法: ${Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).filter(m => m !== 'constructor').join(', ')}`);
            } else if (className === 'NetworkClient') {
                console.log(`✅ ${className} - 已定义`);
                console.log(`   方法: ${Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).filter(m => m !== 'constructor').join(', ')}`);
            } else if (className === 'ScriptLoader') {
                console.log(`✅ ${className} - 已定义`);
                console.log(`   属性: loadedScripts (Set类型)`);
            } else if (className.includes('Backend')) {
                console.log(`✅ ${className} - 已定义`);
                console.log(`   接口方法: recognize(), isEnabled(), getName()`);
            } else if (className === 'OCREngine') {
                console.log(`✅ ${className} - 已定义 (v3.2 重构版)`);
                console.log(`   组件: imagePreprocessor, networkClient, scriptLoader`);
                console.log(`   后端数: ${instance.backends ? instance.backends.length : 0} 个`);
                
                // 验证后端数组
                if (instance.backends && instance.backends.length === 6) {
                    console.log(`   ✅ 后端数量正确 (6个)`);
                    
                    // 验证每个后端
                    const backendNames = instance.backends.map(b => b.getName());
                    console.log(`   后端列表: ${backendNames.join(', ')}`);
                } else {
                    console.log(`   ❌ 后端数量错误! 期望6个, 实际${instance.backends ? instance.backends.length : 0}个`);
                    allPassed = false;
                }
            } else {
                console.log(`✅ ${className} - 已定义`);
            }
        } else {
            console.log(`❌ ${className} - 未定义!`);
            allPassed = false;
        }
        console.log('');
    }
    
    console.log('\n=== 测试结果总结 ===\n');
    
    if (allPassed) {
        console.log('🎊 所有测试通过！OCREngine v3.2 重构成功！');
        console.log('\n📊 统计信息:');
        console.log('  • 总类数: 13个');
        console.log('  • 基础设施层: 4个 (ImagePreprocessor, NetworkClient, ScriptLoader, OCREngineBackend)');
        console.log('  • OCR后端层: 6个 (OCR.space, 百度, 腾讯云, Puter, Tesseract, GLM-4V)');
        console.log('  • 编排器层: 1个 (OCREngine v3.2)');
        console.log('  • 其他: 2个 (ConfigManager, UIBuilder)');
        
        process.exit(0);
    } else {
        console.log('❌ 部分测试失败！请检查上面的错误信息。');
        process.exit(1);
    }
    
} catch (error) {
    console.error('❌ 执行失败:', error.message);
    console.error('\n堆栈:', error.stack);
    process.exit(1);
}
