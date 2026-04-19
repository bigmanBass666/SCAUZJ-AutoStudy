# 优雅大师刷课助手 — 文档中心

> **版本**: v4.0-server-sync
> **目标平台**: scauzj.leykeji.com (乐课在线)
> **核心目标**: 最大化刷课效率，最小化被检测风险

---

## 新人阅读顺序

1. [威胁模型与攻击链](red-team/threat-model.md) — 理解目标系统的完整攻击面
2. [红队测试指南](red-team/testing-guide.md) — 掌握当前战术与蓝队能力评估
3. [服务端校验机制](defense-analysis/server-validation.md) — 理解蓝队最核心的防线
4. [倍速策略](red-team/speed-strategy.md) — 4x加速的原理与安全边界
5. [漏洞报告](red-team/vulnerability-report.md) — 已发现漏洞的完整记录
6. [OCR引擎文档](ocr/ocrEngine.md) — 验证码识别降级链

---

## 红队攻击文档

| 文档 | 说明 |
|------|------|
| [testing-guide.md](red-team/testing-guide.md) | 红队测试指南 — 蓝队能力评估、Plan H 4x安全机制、战术决策 |
| [speed-strategy.md](red-team/speed-strategy.md) | 倍速策略 — 4x加速核心原理：比率而非绝对值 |
| [vulnerability-report.md](red-team/vulnerability-report.md) | 漏洞报告 — 10个已知安全漏洞的完整审计记录 |
| [threat-model.md](red-team/threat-model.md) | 威胁模型 — 攻击者画像、Kill Chain、组合攻击场景 |

## 蓝队防御分析

| 文档 | 说明 |
|------|------|
| [server-validation.md](defense-analysis/server-validation.md) | 服务端校验 — 时间差校验机制，study_record为唯一真理 |
| [tampermonkey-audit.md](defense-analysis/tampermonkey-audit.md) | 油猴审计 — 29项配置项对脚本运行的影响分析 |
| [blue-team-source/](defense-analysis/blue-team-source/) | 蓝队源码归档 — 9个前端JS文件逆向分析原始资料 |

## OCR 模块

| 文档 | 说明 |
|------|------|
| [ocrEngine.md](ocr/ocrEngine.md) | OCR引擎 — 多路fallback降级链：百度→腾讯→OCR.space→Tesseract.js |
| [api-tutorials/](ocr/api-tutorials/) | API Key教程 — 5家OCR服务的申请与配置指南 |

### OCR API 教程索引

| 教程 | 免费额度 | 需实名 | 需信用卡 |
|------|---------|--------|---------|
| [百度智能云 OCR](ocr/api-tutorials/baidu-ocr-apikey-tutorial.md) | 1,000次/月 | ✓ | ✗ |
| [腾讯云 OCR](ocr/api-tutorials/tencent-ocr-apikey-tutorial.md) | 1,000次/月 | ✓ | ✗ |
| [OCR.space](ocr/api-tutorials/ocrspace-apikey-tutorial.md) | 25,000次/月 | ✗ | ✗ |
| [Google Cloud Vision](ocr/api-tutorials/google-cloud-vision-apikey-tutorial.md) | 1,000单元/月 | ✗ | ✓ |
| [Azure AI Vision](ocr/api-tutorials/azure-ai-vision-apikey-tutorial.md) | 5,000次/月 | ✗ | ✓ |

---

## ⚠️ 关于蓝队8层防御体系

蓝队部署了多层纵深防御，从外到内依次为：

1. **前端视频播放器** — ckplayer播放进度控制
2. **前端学习逻辑** — study.js定时上报与进度计算
3. **弹窗验证码** — 学习过程中随机触发的图形验证码
4. **前端时间校验** — 客户端侧的播放时长合理性检查
5. **服务端时间差校验** — `/service/sign`端点基于timestamp的增量比率检测
6. **服务端进度持久化** — study_record页面记录真实观看时长
7. **节点解锁机制** — 前一节点完成才能解锁下一节点
8. **课程完成校验** — 所有节点100%才标记课程完成

> **铁律**: 判断课程是否完成，必须以 `study_record` 页面的服务端数据为准，不可依赖脚本UI面板。
