# 优雅大师 | Elegant Master Study

![Version](https://img.shields.io/badge/version-v4.0--server--sync-blue)
![License](https://img.shields.io/badge/license-MIT-green)

> 自动化课程学习助手 — 红队渗透测试工具

优雅大师是一款 Tampermonkey 油猴脚本，针对 scauzj.leykeji.com 平台实现自动化课程学习。内置 ServerSync 引擎与 8 层蓝队防御绕过机制。

## 核心特性

- **ServerSync 引擎** — 安全比率 0.93，精准模拟真实学习节奏
- **8 层蓝队防御绕过** — 前端检测规避、时间指纹伪装、心跳模拟等
- **OCR 验证码识别** — 4 级降级链，首次通过率 > 85%
- **自动下一节点导航** — 全程零人工干预
- **会话冻结恢复** — 自动重启保障长时间运行稳定
- **热重载开发** — 修改后刷新即生效

## 快速开始

### 前置要求

- Chrome / Edge / Firefox 浏览器
- [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展

### 安装步骤

1. 安装 Tampermonkey 浏览器扩展
2. 点击 Tampermonkey 图标 → 创建新脚本
3. 将 `scripts/elegant-master-study.user.js` 的内容粘贴到编辑器中
4. 保存脚本（Ctrl+S）
5. 访问目标站点，脚本将自动启动

### OCR 配置（可选但推荐）

验证码自动识别需要配置 OCR API 密钥：

1. 复制配置模板：`config/api_key.txt.example` → `config/api_key.txt`
2. 填入百度 OCR API 密钥（免费额度 1000 次/月）
3. 详细配置教程见 `docs/ocr/api-tutorials/`

> 未配置 OCR 时，验证码需手动输入，不影响其他功能。

## 文档

| 文档 | 说明 |
|------|------|
| `docs/ocr/ocrEngine.md` | OCR 降级链架构与配置 |
| `docs/ocr/api-tutorials/` | 各 OCR 服务 API 申请与配置教程 |
| `REDTEAM-TESTING-GUIDE.md` | 红队测试战术指南 |
| `vulnerability-report.md` | 已发现漏洞报告 |
| `worklog.md` | 开发与测试工作日志 |

## 项目结构

```
SCAUZJ-AutoStudy/
├── scripts/
│   └── elegant-master-study.user.js   # 主脚本
├── config/
│   ├── api_key.txt.example            # API 密钥配置模板
│   └── optimization_targets.json      # 优化目标状态
├── docs/
│   └── ocr/                           # OCR 引擎文档与教程
├── worklog.md                         # 工作日志
├── REDTEAM-TESTING-GUIDE.md           # 红队测试指南
├── vulnerability-report.md            # 漏洞报告
├── DISCLAIMER.md                      # 免责声明
├── README.md
└── LICENSE
```

## 免责声明

本工具仅供授权安全测试与学习研究使用。使用者须确保在合法授权范围内使用本工具，遵守相关法律法规及目标平台的服务条款。因使用本工具产生的任何法律责任，由使用者自行承担。

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 作者

- **GitHub**: [bigmanBass666](https://github.com/bigmanBass666)

---

*技术探索项目，仅供学习研究*
