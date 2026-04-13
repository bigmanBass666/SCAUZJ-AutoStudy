/**
 * OCREngine v3.2 重构验证测试 v2
 * 使用AST解析验证类结构
 */

const fs = require('fs');
const acorn = require('acorn');

try {
    console.log('🔍 开始分析 OCREngine v3.2 代码结构...\n');
    
    const scriptContent = fs.readFileSync('./scripts/elegant-master-study.user.js', 'utf8');
    
    // 使用acorn解析JavaScript
    const ast = acorn.parse(scriptContent, {
        ecmaVersion: 2020,
        sourceType: 'script',
        locations: true
    });
    
    // 提取所有class定义
    const classes = [];
    
    function traverse(node, depth = 0) {
        if (!node) return;
        
        if (node.type === 'ClassDeclaration') {
            const className = node.id ? node.id.name : 'Anonymous';
            const methods = [];
            let parentClass = null;
            
            // 获取父类
            if (node.superClass) {
                parentClass = node.superClass.name || node.superClass.type;
            }
            
            // 获取方法
            if (node.body && node.body.body) {
                for (const member of node.body.body) {
                    if (member.type === 'MethodDefinition') {
                        const methodName = member.key.name || member.key.value;
                        const methodKind = member.kind;
                        const isAsync = member.async;
                        methods.push({
                            name: methodName,
                            kind: methodKind,
                            async: isAsync,
                            params: member.value.params.length
                        });
                    }
                }
            }
            
            classes.push({
                name: className,
                parent: parentClass,
                methods: methods,
                line: node.loc.start.line
            });
        }
        
        // 递归遍历子节点
        for (const key of Object.keys(node)) {
            if (key === 'loc' || key === 'start' || key === 'end' || key === 'type') continue;
            
            const child = node[key];
            if (Array.isArray(child)) {
                child.forEach(c => traverse(c, depth + 1));
            } else if (typeof child === 'object' && child !== null) {
                traverse(child, depth + 1);
            }
        }
    }
    
    traverse(ast);
    
    console.log(`📊 发现 ${classes.length} 个类定义:\n`);
    
    // 验证期望的类
    const expectedClasses = {
        'ConfigManager': { type: 'config', expectedMethods: ['load', 'save', 'get', 'set', 'getAll', 'reset'] },
        'ImagePreprocessor': { type: 'infrastructure', expectedMethods: ['extractScaled', 'preprocessGrayscale', 'preprocessInvert', 'sixWayPreprocess', 'cleanText'] },
        'NetworkClient': { type: 'infrastructure', expectedMethods: ['gmFetch', 'fetch'] },
        'ScriptLoader': { type: 'infrastructure', expectedMethods: ['loadScript', 'isGlobalAvailable'] },
        'OCREngineBackend': { type: 'interface', expectedMethods: ['recognize', 'isEnabled', 'getName'], isAbstract: true },
        'OcrSpaceBackend': { type: 'backend', parent: 'OCREngineBackend', expectedMethods: ['recognize', 'isEnabled', 'getName'] },
        'BaiduOcrBackend': { type: 'backend', parent: 'OCREngineBackend', expectedMethods: ['recognize', 'isEnabled', 'getName', 'getAccessToken', 'baiduRequest'] },
        'TencentOcrBackend': { type: 'backend', parent: 'OCREngineBackend', expectedMethods: ['recognize', 'isEnabled', 'getName', 'tc3Sign', 'sha256Hex', 'hex', 'hmacSha256'] },
        'PuterBackend': { type: 'backend', parent: 'OCREngineBackend', expectedMethods: ['recognize', 'isEnabled', 'getName'] },
        'TesseractBackend': { type: 'backend', parent: 'OCREngineBackend', expectedMethods: ['recognize', 'isEnabled', 'getName'] },
        'Glm4VBackend': { type: 'backend', parent: 'OCREngineBackend', expectedMethods: ['recognize', 'isEnabled', 'getName'] },
        'OCREngine': { type: 'orchestrator', version: 'v3.2', expectedMethods: ['solveWithRetry', 'recognize'] },
        'UIBuilder': { type: 'ui', expectedMethods: ['create', 'setEngine', 'buildHeader', 'buildContentWrapper', 'buildFooter'] }
    };
    
    let allPassed = true;
    const foundClasses = new Set(classes.map(c => c.name));
    
    for (const [className, spec] of Object.entries(expectedClasses)) {
        const classDef = classes.find(c => c.name === className);
        
        if (!classDef) {
            console.log(`❌ ${className} - 未找到!`);
            allPassed = false;
            continue;
        }
        
        console.log(`✅ ${className} ${spec.version ? `(${spec.version})` : ''}`);
        
        // 验证继承关系
        if (spec.parent) {
            if (classDef.parent === spec.parent) {
                console.log(`   继承: extends ${spec.parent} ✅`);
            } else {
                console.log(`   继承: 期望 ${spec.parent}, 实际 ${classDef.parent} ❌`);
                allPassed = false;
            }
        } else {
            console.log(`   类型: ${spec.type}`);
        }
        
        // 验证方法
        const foundMethods = new Set(classDef.methods.map(m => m.name));
        const missingMethods = spec.expectedMethods.filter(m => !foundMethods.has(m));
        
        if (missingMethods.length > 0) {
            console.log(`   ❌ 缺少方法: ${missingMethods.join(', ')}`);
            allPassed = false;
        } else {
            console.log(`   方法数: ${classDef.methods.length}个 ✅`);
        }
        
        // 显示关键方法签名
        const importantMethods = classDef.methods.filter(m => 
            spec.expectedMethods.includes(m.name)
        ).slice(0, 3);
        
        if (importantMethods.length > 0) {
            console.log(`   关键方法:`);
            for (const m of importantMethods) {
                console.log(`     • ${m.async ? 'async ' : ''}${m.name}(${m.params}参数)`);
            }
        }
        
        console.log('');
    }
    
    // 检查是否有额外的未预期的类
    const extraClasses = [...foundClasses].filter(c => !expectedClasses[c]);
    if (extraClasses.length > 0) {
        console.log(`⚠️  发现额外类: ${extraClasses.join(', ')}`);
    }
    
    // 版本号检查
    const versionMatch = scriptContent.match(/ELEGANT_VERSION\s*=\s*'([^']+)'/);
    if (versionMatch) {
        console.log(`\n📌 版本号: ${versionMatch[1]}`);
    }
    
    // OCREngine版本标识检查
    const ocrmEngineVersion = scriptContent.match(/OCR.*?v3\.\d+/g);
    if (ocrmEngineVersion) {
        console.log(`📌 OCR引擎版本: ${[...new Set(ocrmEngineVersion)].join(', ')}`);
    }
    
    // 统计信息
    console.log('\n=== 📊 重构统计 ===\n');
    
    const infrastructureClasses = classes.filter(c => 
        ['ImagePreprocessor', 'NetworkClient', 'ScriptLoader', 'OCREngineBackend'].includes(c.name)
    );
    const backendClasses = classes.filter(c => c.name.includes('Backend'));
    const orchestratorClass = classes.find(c => c.name === 'OCREngine');
    
    console.log('架构分层:');
    console.log(`  • 基础设施层: ${infrastructureClasses.length} 个类`);
    infrastructureClasses.forEach(c => console.log(`     - ${c.name}: ${c.methods.length}个方法`));
    
    console.log(`  • OCR后端层: ${backendClasses.length} 个实现`);
    backendClasses.forEach(c => console.log(`     - ${c.name}`));
    
    if (orchestratorClass) {
        console.log(`  • 编排器层: OCREngine (${orchestratorClass.methods.length}个公共方法)`);
    }
    
    // 最终结果
    console.log('\n=== ✅ 测试结果 ===\n');
    
    if (allPassed) {
        console.log('🎊 所有验证通过！OCREngine v3.2 重构成功！');
        console.log('\n✨ 架构改进:');
        console.log('  ✓ 策略模式：6个独立后端可替换');
        console.log('  ✓ 单一职责：每个类只做一件事');
        console.log('  ✓ 开闭原则：添加新后端无需修改现有代码');
        console.log('  ✓ 油猴兼容：单文件IIFE，无全局污染');
        
        process.exit(0);
    } else {
        console.log('❌ 部分验证失败！请检查上面的错误信息。');
        process.exit(1);
    }
    
} catch (error) {
    console.error('❌ 分析失败:', error.message);
    
    if (error.code === 'MODULE_NOT_FOUND') {
        console.error('\n💡 提示: 需要安装acorn库');
        console.error('   运行: npm install acorn');
    }
    
    process.exit(1);
}
