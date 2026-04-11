# 直接注入测试指南

## 快速开始

```bash
# 1. 安装 playwright
npm install playwright

# 2. 运行测试
node test-injection.js
```

## 测试流程

### Phase 1: 登录页 UI 验证
1. 打开登录页
2. 注入修复后的优雅大师脚本
3. 验证面板元素是否正确缓存（核心修复点）

### Phase 2: 环境检测验证
1. 导航到节点页 `/user/node/12345`
2. 检查 `MasterEngine.detectEnvironment()` 能否识别 nodeId 和视频时长
3. 验证 `MasterEngine.ui.updateStatus()` 能否正常更新状态

### Phase 3: 事件绑定测试
1. 点击"启动"按钮
2. 验证 `MasterEngine.start()` 能被触发
3. 观察控制台日志

## 关键检查点

| 检查项 | 预期结果 | 通过标准 |
|--------|---------|---------|
| `cacheElements()` 无 null | 所有元素都能通过 `panel.querySelector` 获取 | `elementCheck.* === true` |
| `updateStatus()` 正常 | 面板数据显示正确 | 截图显示"运行中"状态 |
| 环境检测 | 识别 nodeId 和 duration | `envCheck.detected === true` |
| 按钮响应 | 点击不报错 | console 显示"按钮点击成功" |

## 架构说明

### Polyfill 设计
- `GM_xmlhttpRequest` → 封装的 `fetch`，支持 `credentials: 'include'`
- `GM_setValue` / `GM_getValue` → `localStorage`（key 加 `gm_` 前缀）
- `GM_notification` → 页面内临时通知

### 注入方式
```javascript
// 1. 加载 Polyfill
await page.evaluate(polyfills);

// 2. 注入纯 JS（去掉 ==UserScript== 块）
await page.evaluate(cleanScript);

// 3. 等待 UI 初始化
await page.waitForFunction(() => document.getElementById('elegant-master-panel'));
```

## 调试技巧

- `console.log` 会输出到终端
- 浏览器保持 `headless: false`，可以直接看到面板
- 截图保存到 `panel-check-*.png`

## 已知局限

1. GM API 只是基本 polyfill，高级功能（跨域请求头、文件下载等）未模拟
2. 实际刷课流程中的并发检测、错误重试需手动触发测试
3. 验证码检测模块需要真实图片才能验证

---

**下一步**：运行 `node test-injection.js`，观察控制台输出和截图。
