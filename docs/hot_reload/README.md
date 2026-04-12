# 🚀 优雅大师 - 热更新开发环境

> 无 Tampermonkey 缓存清除的自主开发闭环

---

## ✨ 核心优势

- ✅ **真正闭环**：修改代码 → 注入测试 → 观察结果，无需手动清除缓存
- ✅ **GM Mock**：完整模拟油猴 API，无需扩展也能运行
- ✅ **所有修复已集成**：detectEnvironment、SPA监听、bot cleanup、autoNext 全都在 `main.js`
- ✅ **测试就绪**：`test-runner.js` 自动验证核心功能

---

## 📁 文件说明

```
docs/hot_reload/
├── gm-mock.js          # GM API 模拟层（固定，不用改）
├── main.js             # 主脚本（AI 修改这个文件）
├── test-runner.js      # 测试套件（AI 修改或直接使用）
└── README.md           # 本文档
```

---

## 🧪 快速开始（手动测试）

### 步骤1：打开目标页面

```
https://scauzj.leykeji.com/user/node?nodeId=1429487
```

### 步骤2：F12 打开控制台

### 步骤3：注入 GM Mock

复制 `gm-mock.js` 的全部内容 → 粘贴到控制台 → Enter

### 步骤4：注入主脚本

复制 `main.js` 的全部内容（789行） → 粘贴到控制台 → Enter

**预期输出**：
```
✅ GM API Mock 已注入
✅ 优雅大师UI创建成功
🎯 目标: {nodeId: "1429487", duration: 440}
```

### 步骤5：运行测试（可选）

复制 `test-runner.js` 的全部内容 → 粘贴到控制台 → Enter

3秒后自动输出测试报告到控制台和 `window.__TEST_RESULTS__`

### 步骤6：点击启动

点击面板上的 **"🚀 启动"** 按钮，观察日志：

```
🌟 优雅大师启动 {nodeId: "1429487", duration: 440}
✅ 会话: xxx
⚡ 上报: 15次, 间隔2000ms, 跳跃30s
...（上报日志）...
✅ 完成！耗时: 29.5秒, 记录: 440秒
➡️  自动下一节: /user/node?nodeId=1429488
```

---

## 🔄 开发工作流

```
AI 修改 main.js
    ↓
用户刷新页面，重新注入（步骤3-4）
    ↓
用户点击启动，观察结果
    ↓
AI 根据反馈继续修改
    ↓
循环
```

---

## 📋 测试清单

- [ ] UI 面板正确显示
- [ ] 环境检测返回正确的 nodeId 和 duration
- [ ] 点击"🚀 启动"按钮能开始刷课
- [ ] 进度条正常更新
- [ ] 完成目标后显示"完成"
- [ ] 自动下一节（如果启用）触发 URL 导航

---

## ⚠️ 已知问题

### Playwright MCP 自动化暂时不可用

- `browser_execute` 工具在当前会话中**缺失**
- 需要手动注入代码进行测试
- 手动测试通过后，代码可以直接使用

---

## 📚 相关文档

- `tempermonkey_hot_reload_tutorial.md` - 原教程（提到自动化方案）
- `实践报告-自动注入测试的真实情况.md` - 详细实践记录
- `../../docs/vulnerability-report.md` - 漏洞报告
- `../../docs/REDTEAM-TESTING-GUIDE.md` - 红队测试指南

---

## 🎯 目标状态

当所有测试通过后，将 `main.js` 的修改同步回 `scripts/elegant-master-study.user.js`，提交 git。

---

**祝测试顺利！** 🎉
