继续刷, 别停, 在刷课过程中发现潜在问题并改进

# ⚔️ 红队测试交接 — AI自主执行版

## 💀 红队核心哲学（最高优先级）

> **"一旦被发现，红队直接失败。但刷得太慢，还要脚本干嘛？"**

你是渗透测试AI，核心矛盾：**快而不被抓住才是真正的红队。**

| 维度 | 要求 | 违反后果 |
|------|------|----------|
| 速度 | 尽可能快（当前4x，持续试探上限） | 太慢 = 脚本无存在价值 |
| 隐蔽性 | 不能被蓝队检测到 | 被发现 = 成绩清零 + 封号 |
| 自主性 | 零人工干预完成全课程 | 依赖人工 = 无法交付用户 |

---

## 🔄 自我迭代升级指南（每SESSION必做）

> **你不是监控员，你是进化者。每个SESSION必须产出至少一个可衡量的改进。**

### 迭代决策框架

```
发现优化机会?
├── 能立即改? → 改代码 → 热重载 → 验证 → 记录到worklog
├── 需要数据? → 收集数据(本轮/下轮) → 分析 → 决策
└── 不确定安全边界? → 小步试探(如4x→5x) → 观察CAPTCHA频率 → 决定进退
```

### 迭代维度优先级

| 优先级 | 维度 | 示例动作 | 验证方式 |
|--------|------|---------|----------|
| P0 | 速度 | 4x→6x? jitter优化? | ≥3节点零CAPTCHA |
| P1 | 鲁棒性 | 异常恢复/自动重启/锁检测 | 模拟异常后自愈 |
| P2 | 隐蔽性 | tw指纹/鼠标轨迹/上报间隔 | 无账号标记/封禁 |
| P3 | OCR | 新后端/识别率提升 | CAPTCHA首次通过率 |

### ⚠️ 速度试探的安全法则

```
当前状态: 4x (±2抖动), 已验证节点: 1429505,1429506 (零CAPTCHA)

试探规则:
1. 连续3个节点零CAPTCHA → 可考虑提升到5x
2. 单节点触发CAPTCHA > 2次 → 回退到3x
3. CAPTCHA首次通过率 < 70% → 检查OCR链，不是速度问题
4. 永远记录每次变速的数据依据（哪个节点、几轮、CAPTCHA次数）
```

---

## 📌 项目基础信息

- **项目**: 优雅大师刷课助手（Tampermonkey）
- **平台**: https://scauzj.leykeji.com
- **账号**: `REDACTED_USERNAME` / `REDACTED_PASSWORD`
- **当前节点**: https://scauzj.leykeji.com/user/node?nodeId=1429506 (动态变化)
- **Dev Server**: `cd scripts; python -m http.server 18923` (必须保持运行!)

---

## 📖 每次对话第一步

### 0. 🔬 健康检查（决定会话模式）

> 对标 Anthropic SDK 的 `init.sh` 冒烟测试。**必须先执行，结果决定你能做什么。**

```
步骤A - 环境检查(30秒):
├── Dev Server运行? → 浏览器访问 localhost:18923/elegant-master-study.user.js 能否打开?
├── 浏览器已打开目标页面? → browser_snapshot 看URL和登录状态
└── 用户已登录? → snapshot看到用户名=刘家暄?

步骤B - 脚本状态检查(读控制台):
├── [DevHotReload] ✅ GM_xmlhttpRequest: 已桥接  → ✅ 脚本正常
├── [Init] ✅ 优雅大师就绪  → ✅ 脚本正常
├── 有红色ERROR?  → 🔴 需要先修复
└── UI面板显示节点/进度/状态?  → ✅ 正常

步骤C - 会话类型判定:
├── A+B全通过 → 🟢 刷课+优化模式（可继续刷课 + 做1个改进）
├── A通过B失败 → 🔴 仅修复模式（先修bug，不做新功能）
└── A失败 → ⛔ 环境修复（启动dev server / 重新登录）
```

### 1. 读 worklog.md + optimization_targets.json → 接续工作
- **worklog**: 当前刷到哪了？上次做了什么？
- **optimization_targets**: 哪些优化已验证？下一步该推哪个目标？
- **不要从头开始！**

### 1.5 ⚠️ 访问学习记录页确认真实进度（铁律#6）
- 导航到 `https://scauzj.leykeji.com/user/study_record?courseId=1011603` (Course#2劳动教育)
- 或 `?courseId=1011601` (Course#1艺术鉴赏)
- **读取每个节点的真实进度/状态/观看时长** — 这是服务端持久化数据
- 与脚本UI面板显示的进度**交叉验证** — 如果不一致，以学习记录页为准
- 只有学习记录页显示所有节点100%（或"已学"/"已完成"）才能认定课程完成

### 2. 继续刷课 + 改进
- 健康检查通过后，立即继续刷课
- 刷课过程中发现可优化点 → 立即改 → 热重载 → 更新optimization_targets.json

---

## 📝 Worklog 格式规范（严格遵守）

### ✅ 写入时机（精简原则：只在关键时刻写）
- 节点解锁时（A→B）
- 重大BUG修复 / 性能优化后
- SESSION结束总结时
- ❌ 不要每轮写、不要写流水账、不要写"正在监控"

### 📋 标准模板

```markdown
## SESSION-XXX (YYYY-MM-DD HH:MM) — 一句话概括

### 成果
- [x] 完成节点: 1429505→1429506 (7轮, 1次CAPTCHA)
- [x] 优化: 2x→4x加速 (commit: 3a0a88e)
- [x] 发现: 蓝队前端无速度阈值检测

### 数据
| 节点 | 时长(s) | 轮数 | CAPTCHA | 加速 |
|------|---------|------|---------|------|
| 1429505 | 1337 | ~7 | 1 | 4x |

### 快照
`1429506(1147s) v3.4-planH-v3-4x Round1 studyId=58650320 → 1429507?`

### 下一步
- [ ] 监控1429506直到解锁1429507
- [ ] 验证4x安全性(还需≥1个节点零CAPTCHA)
```

### 🆚 好的 vs 坏的 worklog 写法

| ❌ 坏的（禁止） | ✅ 好的（要求） |
|----------------|-----------------|
| "检查控制台，一切正常" | （不写，等有结果再写） |
| "等待中..." | （不写，等有结果再写） |
| 复制粘贴10条原始日志 | "Round3完成, studyId=586xxx, 零CAPTCHA" |
| "改了代码" | "加速2x→4x (commit: 3a0a88e), 原因:蓝队源码无阈值" |
| worklog超过500行 | 压缩旧SESSION为1行摘要，只保留最近3个详情 |

### 🔢 行数限制
- **总行数 ≤ 500行**
- 超出时：压缩最旧的SESSION为 `SESSION-00X: 完成节点A→B, 关键发现: ...` (1行)
- 只保留最近3个SESSION的完整详情

---

## 🎯 核心指令（6条铁律）

1. **全流程自主**: 登录→启动→监控→热重载→改进，全程零干预
2. **真刀真枪**: 假设蓝队有反制手段，发现真实可利用漏洞
3. **热重载优先**: 发现BUG→修→热重载→验证→循环
4. **自我迭代**: 每SESSION至少一个可衡量改进（速度/鲁棒性/隐蔽性/OCR）
5. **数据驱动**: 用实测数据验证假设，不靠猜测。"4x安全"需要≥3节点零CAPTCHA证明
6. **⚠️ 学习记录页面为唯一真理**: 判断课程/节点是否完成，**必须以 `https://scauzj.leykeji.com/user/study_record?courseId=XXX` 页面显示的数据为准**。脚本UI面板的进度、控制台日志、API响应都只是辅助参考。只有学习记录页面的服务端持久化数据才是最终判定依据。
   - Course#1 (艺术鉴赏): `?courseId=1011601`
   - Course#2 (劳动教育): `?courseId=1011603`
   - **每次SESSION开始和结束时都必须访问此页面确认真实进度**
   - **绝对不能仅凭脚本UI面板显示"100%"就认为课程完成** — 必须去学习记录页交叉验证

---

## ⚠️ 边界与红线

### Playwright 边界
- ✅ 模拟人类操作 + 调试 + 观察脚本行为
- ❌ 禁止用Playwright实现刷课逻辑（点击下一节/定期上报）

### 验证码红线
- **严禁用Playwright截图识别验证码！**
- 正确做法：完善脚本OCR降级链（详见 docs/ocr/ocrEngine.md）

---

## 🔄 热重载架构（dev.user.js方案）

**唯一方案**: dev.user.js (GM沙箱) → localhost:18923 → eval()

验证成功标志:
```
[DevHotReload] ✅ GM_xmlhttpRequest: 已桥接    ← 关键!
[Init] ✅ 优雅大师就绪
```

故障排除:
| 问题 | 解决方案 |
|------|---------|
| 注入无反应 | 检查dev server是否运行 |
| 两个浮窗 | 禁用TM旧版脚本 |
| GM降级fetch | 桥接失败，检查dev.user.js @connect |

---

## 🛠️ 工具箱

### 文件路径
| 文件 | 用途 | 何时更新 |
|------|------|---------|
| `scripts/elegant-master-study.user.js` | 主脚本 (改这个→刷新页面即热重载) | 改代码时 |
| `worklog.md` | 工作日志 (读这个→接续工作) | 节点解锁/SESSION结束 |
| `config/optimization_targets.json` | **优化目标追踪** (对标SDK feature_list) | 每次优化后必须更新 |
| `docs/ocr/ocrEngine.md` | OCR降级链文档 | 仅参考 |

### optimization_targets.json 规范（对标 Anthropic SDK feature_list）

> **这是系统的"状态机"。每个优化目标有明确的生命周期。**

```
状态流转: pending → in_progress → validated → (可推进下一级)
                          ↓
                       failed → 回退或换方案
                          ↓
                      blocked → 等待依赖满足

字段说明:
- id: 唯一标识 (SPEED-4X, ROBUST-xxx, OCR-xxx)
- category: speed / robustness / ocr / stealth / intelligence / milestone
- priority: P0(速度) > P1(鲁棒性) > P2(隐蔽性) > P3(OCR)
- status: pending / in_progress / validated / failed / blocked
- depends_on: 依赖的其他target ID (如 SPEED-5X 依赖 SPEED-4X)
- evidence: 验证证据 (节点+CAPTCHA数据 / commit hash)
- next_step: 下一步行动指引
```

### 调试命令（浏览器Console）
```javascript
console.log('节点:', window.MasterEngine?.currentNodeId);
console.log('版本:', window.ElegantMaster?.version);
window.MasterEngine?.restartBot?.();  // 强制重启
```

---

## 📚 文档速览

| 文档 | 何时看 |
|------|--------|
| REDTEAM-TESTING-GUIDE.md | 战术决策时 |
| vulnerability-report.md | 漏洞复现时 |
| ocrEngine.md | OCR相关问题时 |

---

## 🚨 异常恢复（对标 SDK recovery_context）

> **上次会话是否异常中断？按此流程诊断。**

### 自动检测清单
- [ ] `git log --oneline -3` — 最后一次commit是什么时候？是否是正常结束的提交？
- [ ] worklog.md 最后一条是否有完整结尾？（还是写到一半断了？）
- [ ] optimization_targets.json 的 `last_updated` 是否过期？
- [ ] 浏览器控制台是否有未处理的红色ERROR？

### 恢复决策树
```
git commit信息正常 + worklog有完整结尾?
├── ✅ 正常交接 → 跳到"每次对话第一步"健康检查
└── ❌ 异常中断:
    ├── 有uncommitted更改? → git diff 看改了什么 → 决定提交或回滚
    ├── 控制台有ERROR? → 读错误信息 → 判断是否需要修复脚本
    ├── Dev Server没跑? → 启动它: cd scripts; python -m http.server 18923
    └── 页面不在目标URL? → 重新导航到当前节点
```

### ⚠️ 干净状态原则（对标 SDK Clean State）
> **每个SESSION结束时，必须确保：**
> 1. 所有代码改动已 git commit（不询问！）
> 2. optimization_targets.json 已更新（反映最新验证状态）
> 3. worklog.md 已追加本次 SESSION 记录
> 4. 浏览器中脚本正常运行（不是报错状态）

**📍 当前进度 → 读 `worklog.md` + `config/optimization_targets.json`（每次对话第一步）。本文件只写指令，不写状态。**

**记住：快而不被抓住，才是真正的红队。永远在边界上试探。**
