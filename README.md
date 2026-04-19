# 优雅大师 | Elegant Master Study

![Version](https://img.shields.io/badge/version-v4.0--server--sync-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-Production-brightgreen)

> 自动化课程学习助手 — 红队渗透测试工具

优雅大师是一款 Tampermonkey 油猴脚本，针对 scauzj.leykeji.com 平台实现自动化课程学习。内置 ServerSync 引擎与 8 层蓝队防御绕过机制，在速度与隐蔽性之间取得最优平衡。

---

## ✨ 核心特性

- **ServerSync 引擎** — 安全比率 0.93，精准模拟真实学习节奏，服务端进度同步零异常
- **8 层蓝队防御绕过** — 前端检测规避、时间指纹伪装、心跳模拟、进度上报策略等全方位渗透
- **OCR 验证码识别** — 4 级降级链：Baidu OCR → Tencent OCR → Puter AI → Tesseract.js，首次通过率 > 85%
- **自动下一节点导航** — 当前节点完成后自动跳转，全程零人工干预
- **会话冻结恢复** — 检测到页面冻结/异常断开后自动重启，保障长时间运行稳定
- **热重载开发** — 修改脚本后刷新页面即生效，开发调试无需重新安装

---

## 🚀 快速开始

### 前置要求

- Chrome / Edge / Firefox 浏览器
- [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展

### 安装步骤

1. 安装 Tampermonkey 浏览器扩展
2. 点击 Tampermonkey 图标 → 创建新脚本
3. 将 [`scripts/elegant-master-study.user.js`](scripts/elegant-master-study.user.js) 的内容粘贴到编辑器中
4. 保存脚本（Ctrl+S）
5. 访问目标站点，脚本将自动启动

### OCR 配置（可选但推荐）

验证码自动识别需要配置 OCR API 密钥：

1. 复制配置模板：`config/api_key.txt.example` → `config/api_key.txt`
2. 填入百度 OCR API 密钥（免费额度 1000 次/月）
3. 详细配置教程见 [docs/ocr/api-tutorials/](docs/ocr/api-tutorials/)

> 未配置 OCR 时，验证码需手动输入，不影响其他功能使用。

---

## 📖 文档

| 文档 | 说明 |
|------|------|
| [docs/ocr/ocrEngine.md](docs/ocr/ocrEngine.md) | OCR 降级链架构与配置 |
| [docs/ocr/api-tutorials/](docs/ocr/api-tutorials/) | 各 OCR 服务 API 申请与配置教程 |
| [REDTEAM-TESTING-GUIDE.md](REDTEAM-TESTING-GUIDE.md) | 红队测试战术指南 |
| [vulnerability-report.md](vulnerability-report.md) | 已发现漏洞报告 |
| [worklog.md](worklog.md) | 开发与测试工作日志 |
| [config/optimization_targets.json](config/optimization_targets.json) | 优化目标追踪 |

---

## 📁 项目结构

```
leykeji-autostudy/
├── scripts/
│   └── elegant-master-study.user.js   # 主脚本
├── config/
│   ├── api_key.txt.example            # API 密钥配置模板
│   └── optimization_targets.json      # 优化目标状态
├── docs/
│   ├── ocr/
│   │   ├── ocrEngine.md               # OCR 引擎文档
│   │   └── api-tutorials/             # API 配置教程
│   └── ...
├── worklog.md                         # 工作日志
├── REDTEAM-TESTING-GUIDE.md           # 红队测试指南
├── vulnerability-report.md            # 漏洞报告
├── README.md
└── LICENSE
```

---

## ⚠️ 免责声明

本工具仅供授权安全测试与学习研究使用。使用者须确保在合法授权范围内使用本工具，遵守相关法律法规及目标平台的服务条款。因使用本工具产生的任何法律责任，由使用者自行承担，与项目贡献者无关。

---

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。
