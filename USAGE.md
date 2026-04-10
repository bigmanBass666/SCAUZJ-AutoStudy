# 教育平台安全测试工具 - 使用手册

## 概述

`security-tester-v2.0.user.js` 是一个专门为乐课在线学习平台 (`scauzj.leykeji.com`) 设计的自动化漏洞验证工具。该脚本基于已发现的安全漏洞报告实现，用于:

- 验证漏洞的实际存在性
- 评估漏洞可利用性
- 生成详细的测试报告
- 辅助安全修复优先级决策

## 支持的漏洞类型

| 漏洞ID | 严重程度 | 描述 |
|--------|----------|------|
| VULN-001 | 🔴 严重 | 学习时长API无服务端真实验证 |
| VULN-002 | 🟠 高危 | 登录验证码可被AI自动识别 |
| VULN-003 | 🟠 高危 | 并行播放检测仅依赖localStorage可被伪造 |
| VULN-004 | 🔴 严重 | 鼠标轨迹追踪数据从未发送至服务端 |
| VULN-005 | 🟡 中危 | 学习过程中验证码可被自动解决 |
| VULN-006 | 🟠 高危 | 签名验证端点存在实现错误 |
| VULN-007 | 🟡 中危 | 视频进度条限制可被API绕过 |
| VULN-008 | 🟡 中危 | 无页面可见性服务端验证 |
| VULN-009 | 🟢 低危 | 学习时长上报无速率限制 |
| VULN-010 | 🟢 低危 | Cookie/会话管理存在弱点 |

## 安装步骤

### 1. 安装Tampermonkey扩展

#### Chrome/Edge浏览器:
1. 访问 Chrome Web Store 或 Edge Add-ons
2. 搜索 "Tampermonkey"
3. 点击 "添加到Chrome" / "添加到Edge"
4. 确认安装

#### Firefox:
1. 访问 Firefox Add-ons
2. 搜索 "Tampermonkey"
3. 点击 "添加到Firefox"

### 2. 安装脚本

#### 方法A: 直接安装
1. 打开 Tampermonkey 扩展面板
2. 点击 "+" 创建新脚本
3. 删除模板内容
4. 复制 `security-tester-v2.0.user.js` 全部内容
5. 粘贴到编辑器
6. 按 `Ctrl+S` 保存

#### 方法B: 通过URL (需要服务器)
1. 将脚本文件放在Web服务器
2. Tampermonkey点击"实用程序" → "安装用户脚本"
3. 输入脚本URL

### 3. 启用脚本

1. 访问目标网站: `https://scauzj.leykeji.com`
2. 页面右上角将显示控制面板
3. 勾选 "启用测试工具"
4. 点击 "运行漏洞验证" 开始测试

## 使用流程

```
┌─────────────────────────────────────────────────────────────┐
│                    安全测试流程                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 登录测试账号                                              │
│     └─ • 访问 https://scauzj.leykeji.com                    │
│         • 使用测试账号登录                                   │
│                                                              │
│  2. 启用测试工具                                              │
│     └─ • 右上角勾选"启用测试工具"                            │
│         • 确认安全警告                                       │
│                                                              │
│  3. 运行漏洞验证                                              │
│     └─ • 点击"运行漏洞验证"按钮                              │
│         • 确认测试弹窗                                       │
│         • 等待所有模块完成                                   │
│                                                              │
│  4. 查看报告                                                  │
│     └─ • 点击"查看报告"按钮                                 │
│         • 查看详细的漏洞列表                                 │
│         • 点击"导出报告"保存到本地                           │
│                                                              │
│  5. 清理测试数据                                              │
│     └─ • 点击"清除测试数据"按钮                             │
│         • 确认清除所有localStorage中的测试痕迹              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 配置说明

### 基础配置

```javascript
CONFIG = {
    ENABLED: false,              // ⚠️ 必须先设为true才能运行
    DEBUG: false,                // 调试日志(推荐开启)
    VERBOSE: false,              // 极度详细日志
}
```

### 测试模块开关

```javascript
MODULES: {
    CLIENT_TIME: true,           // VULN-001: 客户端时间漏洞
    API_REPLAY: true,           // VULN-001: API重放漏洞
    LOCAL_STORAGE: true,        // VULN-003: localStorage伪造
    MOUSE_TRACKING: true,       // VULN-004: 鼠标轨迹未上传
    PAGE_VISIBILITY: true,      // VULN-008: 页面可见性绕过
    CAPTCHA_BYPASS: true,       // VULN-002/005: 验证码绕过
    SIGNATURE: true,            // VULN-006: 签名验证错误
    PROGRESS_BYPASS: true,      // VULN-007: 进度条限制绕过
    RATE_LIMIT: true,           // VULN-009: 速率限制缺失
    SESSION_SECURITY: true      // VULN-010: 会话管理弱点
}
```

### AI验证码识别 (可选)

```javascript
AI_RECOGNITION: {
    ENABLED: false,              // 启用AI识别验证码
    API_KEY: 'your-api-key',     // 智谱AI API Key
    API_URL: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    MODEL: 'glm-4v-flash'        // 使用免费模型
}
```

**获取API Key**:
1. 访问 https://open.bigmodel.cn
2. 注册/登录账号
3. 进入 "API密钥管理"
4. 创建新API Key
5. 填入配置

## 测试报告解读

### 报告结构

```
╔══════════════════════════════════════════════════════════════╗
║                   安全漏洞验证测试报告                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  测试ID: test_1712823456789                                 ║
║  目标URL: https://scauzj.leykeji.com/...                   ║
║  测试时间: 2026-04-11T10:23:45.678Z                        ║
║  运行时长: 15.23s                                           ║
║  网络请求数: 127                                            ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  风险评分: 45% 🟠 高危 (多漏洞可利用)                        ║
╠══════════════════════════════════════════════════════════════╣
║  漏洞统计:                                                   ║
║    🔴 严重: 2                                               ║
║    🟠 高危: 3                                               ║
║    🟡 中危: 3                                               ║
║    🟢 低危: 2                                               ║
║    ⚪ 总计: 10                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### 漏洞详情示例

```
1. [VULN-001-A] CRITICAL
  标题: 客户端时间可被JavaScript修改
  详情: 攻击者可以通过修改Date对象来影响依赖客户端时间的验证逻辑
  证据: {
    "testType": "time_manipulation",
    "manipulated": true,
    "method": "Date.prototype override"
  }
```

## 控制面板功能

### 启用/禁用开关
- 勾选后脚本才会运行
- 设置会保存到Tampermonkey存储

### 运行漏洞验证
- 执行所有启用的测试模块
- 显示运行状态
- 自动生成报告

### 查看报告
- 显示完整的测试结果
- 按风险等级分类显示
- 统计每类漏洞数量

### 导出报告
- 将报告保存为 `.txt` 文件
- 包含详细日志和证据
- 适合提交给开发团队

### 清除测试数据
- 删除所有localStorage中的测试痕迹
- 包括日志、报告、测试标记
- 一键清理,方便下一次测试

## 测试结果存储

测试数据存储在浏览器localStorage中:

```
key格式: security_test_logs_{testId}
         security_report_{testId}

保留内容:
• 测试时间戳
• 配置信息
• 详细日志
• 漏洞发现
• 网络请求记录(可选)
```

## 故障排除

### 问题: 控制面板未出现
**可能原因:**
- 脚本未安装或未启用
- 页面未完全加载
- 与页面样式冲突

**解决:**
1. 检查Tampermonkey面板,确认脚本已启用
2. 刷新页面,等待2秒后查看
3. 按F12查看控制台错误

### 问题: 报告显示"未发现漏洞"
**可能原因:**
- 页面不是学习页面
- 代码已修复
- 需要先登录

**解决:**
1. 确认已登录并访问学习页面
2. 查看控制台日志了解测试详情
3. 确认漏洞是否已被修复

### 问题: AI识别功能失败
**可能原因:**
- API Key未配置
- 网络请求被阻止
- 验证码图片无法获取

**解决:**
1. 检查CONFIG.AI_RECOGNITION.ENABLED是否为true
2. 确认API Key有效
3. 验证码端点是否可访问

## 安全注意事项

### ⚠️ 重要警告

1. **仅用于授权测试**
   - 必须获得目标系统所有者的明确授权
   - 不得用于未授权的任何系统

2. **仅限测试环境**
   - 禁止在生产环境运行
   - 建议使用预生产或 staging 环境

3. **数据清理**
   - 测试后务必清除测试数据
   - 避免影响真实用户数据

4. **责任归属**
   - 滥用工具造成的后果由使用者承担
   - 开发者不承担任何连带责任

### 防护措施

脚本已内置防护机制:

- ✅ ENALBED默认false,必须手动启用
- ✅ 运行前确认对话框
- ✅ 所有操作可撤销(清除数据按钮)
- ✅ 测试数据隔离存储
- ✅ 不修改真实用户数据
- ✅ 网络请求监控安全

## 技术细节

### 检测方法

| 漏洞 | 检测技术 |
|------|----------|
| VULN-001 | 时间操纵模拟、API请求分析、递增验证 |
| VULN-002 | 端点扫描、验证码复杂度分析 |
| VULN-003 | localStorage读写测试、代码模式匹配 |
| VULN-004 | 代码静态分析、函数钩子监测 |
| VULN-005 | DOM元素检测、登录流程分析 |
| VULN-006 | 参数暴露检查、端点响应分析 |
| VULN-007 | 播放器配置检查、API调用分析 |
| VULN-008 | 代码扫描、API覆盖检测 |
| VULN-009 | 速率限制测试、快速请求发送 |
| VULN-010 | Cookie属性检查、CSRF token扫描 |

### 网络监控

脚本自动钩住以下网络API:
- `XMLHttpRequest` - 传统AJAX请求
- `window.fetch` - 现代API调用

捕获信息:
- 请求方法、URL
- 请求体(前500字符)
- 响应状态码
- 请求耗时

### 代码分析

脚本在运行时:
1. 扫描所有`<script>`标签内容
2. 匹配特定模式(如`node_play_`、`sentLog`、`sign`)
3. 提取相关代码片段供分析
4. 生成代码级证据

## 扩展开发

### 添加新的检测模块

```javascript
class MyCustomTester {
    constructor(logger, detector) {
        this.logger = logger;
        this.detector = detector;
    }

    async test() {
        this.logger.log('开始我的测试...', 'info', 'my-module');

        // 测试逻辑
        const result = await this.performTest();

        if (result.vulnerable) {
            this.detector.addFinding(
                'CUSTOM-001',
                '发现的问题标题',
                'medium',
                '问题描述',
                result.evidence
            );
        }

        this.logger.log('测试完成', 'success', 'my-module');
    }
}
```

然后在主控制器中添加:
```javascript
{ name: '我的测试模块', test: new MyCustomTester(this.logger, this.detector) }
```

## 版本历史

### v2.0.0 (当前版本)
- ✅ 新增VULN-007, 008, 010检测
- ✅ 重构为模块化架构
- ✅ 添加可视化UI面板
- ✅ 支持报告导出
- ✅ 网络请求监控
- ✅ 完善的日志系统

### v1.0.0
- ✅ 基础框架
- ✅ VULN-001, 002, 003, 004, 006检测
- ✅ 控制面板

## 附录

### A. 相关文档
- `vulnerability-report.md` - 完整漏洞报告
- `threat-model-attack-chain.md` - 威胁建模分析
- `prompt.md` - 原始需求文档

### B. CVSS评分说明
详见漏洞报告的附录部分。

### C. 修复建议
每个漏洞都附带具体的修复建议和预估工时。

---

**免责声明**: 本工具仅用于授权的安全测试。使用者应对自己的行为负完全责任。
