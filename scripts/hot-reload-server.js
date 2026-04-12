/**
 * 优雅大师热更新服务器
 * 
 * 功能：
 * 1. WebSocket 服务：端口 8082
 * 2. 文件监听：监听 elegant-master-study.user.js 变化
 * 3. 自动推送：文件变化时推送新代码给所有连接的客户端
 * 
 * 使用：
 *   node hot-reload-server.js
 * 
 * 脚本需内置连接此服务器实现热更新
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const PORT = 8082;
const SCRIPT_PATH = path.join(__dirname, 'elegant-master-study.user.js');

// 保存连接的客户端
const clients = new Set();

// 创建WebSocket服务器
const wss = new WebSocket.Server({ port: PORT });
console.log(`🔌 热更新服务器启动: ws://localhost:${PORT}`);
console.log(`📁 监听文件: ${SCRIPT_PATH}`);

wss.on('connection', (ws) => {
    console.log('✅ 客户端已连接');
    clients.add(ws);
    
    // 发送当前版本
    sendCurrentVersion(ws);
    
    ws.on('close', () => {
        console.log('❌ 客户端断开');
        clients.delete(ws);
    });
    
    ws.on('error', (err) => {
        console.error('WebSocket错误:', err.message);
    });
});

// 发送当前脚本版本
function sendCurrentVersion(ws) {
    try {
        const code = fs.readFileSync(SCRIPT_PATH, 'utf8');
        const version = Date.now().toString();
        ws.send(JSON.stringify({
            type: 'reload',
            version,
            code,
            timestamp: new Date().toISOString()
        }));
        console.log(`📤 已推送版本 ${version} 到客户端`);
    } catch (err) {
        console.error('读取脚本失败:', err.message);
    }
}

// 广播给所有客户端
function broadcast(data) {
    clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    });
}

// 监听文件变化（需要 npm install chokidar）
if (chokidar) {
    const watcher = chokidar.watch(SCRIPT_PATH, {
        ignored: /(^|[\/\])\../, // 忽略点文件
        persistent: true
    });
    
    watcher.on('change', (path) => {
        console.log(`\n📝 检测到文件变化: ${path}`);
        const code = fs.readFileSync(SCRIPT_PATH, 'utf8');
        const version = Date.now().toString();
        const message = JSON.stringify({
            type: 'reload',
            version,
            code,
            timestamp: new Date().toISOString()
        });
        broadcast(message);
        console.log(`📤 已广播新版本 ${version} 到 ${clients.size} 个客户端`);
    });
    
    console.log('👀 文件监听已启动');
} else {
    console.warn('⚠️  chokidar 未安装，文件监听不可用');
    console.warn('   运行: npm install chokidar --save-dev');
}

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n👋 关闭服务器...');
    wss.close();
    process.exit(0);
});

console.log('\n💡 等待客户端连接...\n');
