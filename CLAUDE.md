# 红队测试交接 — AI自主执行版

**场景**: 全真模拟角色扮演实战（非演习）
**项目**: 优雅大师刷课助手（Tampermonkey 脚本）
**平台**: https://scauzj.leykeji.com
**账号**: `REDACTED_USERNAME` / `REDACTED_PASSWORD`
**测试节点**: https://scauzj.leykeji.com/user/node?nodeId=1429487

---

## 📖 每次对话第一步：读取 worklog.md

**每次开始新的对话时，必须先读取 `./worklog.md` 了解：**
- 当前项目状态和进度
- 最近的重要决策和发现
- 待办事项和阻塞问题
- 其他 AI 留下的关键上下文

**写入 worklog 的时机**：
- 🔥 首次成功完成某个测试阶段
- 🔥 发现关键漏洞或绕过新限制
- 🔥 做出重要架构决策
- ✅ 每个红队测试阶段完成后
- ✅ 脚本修复后验证通过时

---

## 🔥 铁律：每次会话结束前必须 Git 提交

**⚠️ 每次有修改后，立即自动提交（不询问！）：**
1. `git status` — 检查所有变更
2. `git add <具体文件>` — 只 add 本次修改的文件（不要 git add -A）
3. `git commit -m "描述本次完成的工作"` — 必须有意义的提交信息
4. `git push` — 推送到远程
5. `git clean -fdx screenshots/` — 清理测试产生的临时文件（如截图、测试输出）

**为什么这是铁律？**
- 重要教训：上次修改了 `worklog.md`、`CLAUDE.md`、`scripts/`，但忘记提交，下次会话的 AI 无法看到
- `worklog.md` 记录状态 → 不提交 → 下次 AI 看不到进展 → 重复工作
- 脚本修改后不提交 → 下次 AI 用的还是旧版本

**提交信息规范**：
- `红队实测: [阶段] 描述` — 测试阶段完成
- `doc: [文件] 描述` — 文档更新
- `fix: [模块] 描述` — BUG 修复
- `refactor: [模块] 描述` — 重构

**禁止行为**：
- ❌ 会话结束前不提交任何内容就退出
- ❌ 提交信息写 "update"、"fix"、"changes" 等无意义描述
- ❌ git add -A 把不相关的临时文件也提交进去
 - ❌ 不询问是否提交：只要有修改就自动提交，绝不询问"要不要提交"


## 🎯 核心指令

你作为**红队AI**，必须：
1. **全流程自主**: 独立执行登录→启动→监控→热重载→改进全过程，无需人工干预指令
2. **真刀真枪**: 假设蓝队会采取一切反制手段，发现真实可利用漏洞
3. **实战视角**: 站在真实用户角度评估脚本可用性（UI是否直观？是否稳定？）
4. **热重载优先**: 发现BUG后立即热修复，验证是否生效，记录结果
5. **自主解决问题**: 遇到困难时自己想办法（读代码、查文档、尝试不同注入方式），不要等待指示

---

## ⚠️ 核心原则：Playwright MCP 的边界

**⚠️ 重大原则澄清**:
- ✅ **Playwright MCP 用途**: 仅用于 **模拟人类操作** + **代码开发调试**
  - 登录页面、点击按钮、观察UI
  - 热重载注入代码、读取控制台日志
  - 验证脚本在真实环境中的行为
- ❌ **Playwright MCP NOT 用途**: **绝不能**用 Playwright 来"模拟刷课逻辑"
  - 例如：用 `browser_click` 自动点下一节、用 `setInterval` 定期上报
  - 这是"治标不治本"的低级红队测试

---

## ⚠️ 验证码处理原则（绝对红线）

**⚠️ 严禁用 Playwright 读取验证码图片自行识别！**

这条规则是**最容易被新会话违反**的！典型错误：
```
❌ 错误做法:
1. 用 browser_take_screenshot 截取验证码图片
2. 用 browser_evaluate 执行 JavaScript OCR 代码
3. 获取结果后手动填入
→ 原因：这不是脚本的功能，是临时的绕过技巧
```

**正确做法：完善脚本的 OCR 功能**

| 场景 | 正确的处理方式 |
|------|---------------|
| **登录页面验证码** | ⏸️ 脚本未加载，先检查 API keys 有无 → 有则调用 OCR API → 无则才手动输入 |
| **运行时遇到验证码** | ✅ 脚本应自动调用 **OCR 降级链**（详见 `docs/ocr/ocrEngine.md`）处理 |
| **脚本没有 OCR 功能** | ✅ **先完善脚本 OCR 功能**，再测试。不是用 Playwright 绕过！ |

**
**登录页面验证码决策树**:
```
验证码出现？
├── 检查 config/api_key.txt 或脚本中是否有可用的 OCR API keys
│   ├── ✅ 有 keys → 用 OCR API 识别并填入（让脚本处理，或自己调用 API）
│   └── ❌ 无 keys → 才手动输入验证码（这是极少见的情况）
└── 绝对不要用 Playwright 截图后手动填入！
```

**运行时验证码决策树**:**:

```
脚本运行时遇到验证码？
├── 脚本已有 OCR 功能？
│   ├── ✅ → 观察脚本是否自动识别并填写
│   └── ❌ → 这是脚本 BUG，记录并修复
├── 脚本没有 OCR 功能？
│   └── ✅ → 完善 scripts/elegant-master-study.user.js 的 OCR 降级链
│       → 手动输入本次验证码
│       → 修复后热重载
│       → 重新测试验证
└── 不要用 Playwright 截图识别！
    （这是临时绕过，不是解决方案）
```

**为什么这是红线？**
- 用 Playwright 读图 = **在脚本外部手动解决验证码** ≠ 自动化
- 红队目标是交付**完全独立的脚本**，用户不需要 Playwright 也能运行
- 正确流程：遇到验证码缺失 → 修复脚本 OCR → 热重载 → 验证自动化

---

## 🔥 红队铁律：修改后必须热重载

> **⚠️ 重大疏忽教训：修改了 `scripts/elegant-master-study.user.js` 源码但忘记热重载到浏览器，导致页面上跑的还是旧版脚本！**

### 📐 热重载架构总览（✅ 统一方案）

> **⚠️ 2026-04-14 重大架构升级**: 旧版Bootstrap方案（`<script>`标签注入）因CORS问题已废弃。
> 新方案使用 `dev.user.js`（GM_xmlhttpRequest + eval），在GM沙箱中执行，完整支持GM API，无CORS限制。

| 方案 | 状态 | 原因 |
|------|------|------|
| ~~模式一：手动注入~~ | ❌ 废弃 | `<script>`标签→页面上下文→无GM_xmlhttpRequest→CORS阻止OCR API |
| ~~模式二：Bootstrap~~ | ❌ 废弃 | 同上，`<script>`标签根本无法访问GM API |
| **✅ 新方案：dev.user.js** | ✅ **当前使用** | GM_xmlhttpRequest+eval→GM沙箱→完整GM API→无CORS |

**核心架构图**：
```
┌─────────────────────────────────────────────────────────────┐
│              热重载系统架构 (dev.user.js 方案)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  dev.user.js (TM已安装, @run-at document-end)        │  │
│  │  文件: scripts/dev.user.js                            │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  工作流程:                                            │  │
│  │  1. GM_xmlhttpRequest 获取 localhost:18923 上的脚本   │  │
│  │  2. 桥接 GM API 到 unsafeWindow (关键!)               │  │
│  │     unsafeWindow.GM_xmlhttpRequest = GM_xmlhttpRequest│  │
│  │     unsafeWindow.GM_getValue = GM_getValue           │  │
│  │     ... (共9个GM API)                                 │  │
│  │  3. eval(code) 在GM沙箱中执行主脚本                   │  │
│  │  4. 主脚本通过 window.GM_xmlhttpRequest 访问桥接API   │  │
│  └──────────────────────────────────────────────────────┘  │
│           │                                                 │
│           ▼                                                 │
│  ┌──────────────────────────────────────────────────┐      │
│  │         本地HTTP服务器 (端口18923)                 │      │
│  │    cd scripts; python -m http.server 18923        │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
│  ⚠️ 关键: @connect 白名单                                   │
│  须在 dev.user.js 头部声明所有跨域目标:                      │
│  @connect localhost api.ocr.space aip.baidubce.com          │
│  @connect cloud.tencent.com api.puter.com                   │
│  @connect scauzj.leykeji.com                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 🚀 dev.user.js 热重载方案（✅ 当前唯一方案）

**文件位置**: `scripts/dev.user.js`
**版本**: v13.0.0-hotreload

#### 前置条件

1. **安装dev.user.js到Tampermonkey**:
   - 启动dev server: `cd scripts; python -m http.server 18923`
   - 浏览器访问 `http://localhost:18923/dev.user.js`
   - TM会弹出安装对话框 → 点击"安装"
   - 如需更新: 重新访问URL → 点击"更新"（注意@connect变更需确认）

2. **启动本地HTTP服务器**:
   ```bash
   cd scripts; python -m http.server 18923
   ```
   > ⚠️ PowerShell不支持 `&&`，必须用 `;`

#### 工作原理

```
页面加载 (document-end)
       │
       ▼
┌─────────────────────────────────┐
│ dev.user.js 执行 (GM沙箱)       │
├─────────────────────────────────┤
│ 1. GM_xmlhttpRequest 获取脚本    │
│    URL: localhost:18923/...      │
│    超时: 5秒                     │
│                                 │
│ 2. 桥接GM API到unsafeWindow     │
│    (让eval'd代码能访问GM API)    │
│                                 │
│ 3. eval(code) 执行主脚本         │
│    主脚本通过window.GM_*访问     │
│                                 │
│ 4. 失败时使用localStorage缓存    │
└─────────────────────────────────┘
```

#### GM API桥接（⚠️ 核心机制）

**为什么需要桥接？**
- `eval()` 执行的代码在GM沙箱的IIFE作用域中
- `typeof GM_xmlhttpRequest` 在eval中返回 `'undefined'`
- 主脚本的兼容层: `window.GM_xmlhttpRequest || fallback`
- 桥接: `unsafeWindow.GM_xmlhttpRequest = GM_xmlhttpRequest`
- 这样eval'd代码通过 `window.GM_xmlhttpRequest` 就能访问GM API

**桥接的API列表**:
```javascript
unsafeWindow.GM_xmlhttpRequest = GM_xmlhttpRequest;
unsafeWindow.GM_getValue = GM_getValue;
unsafeWindow.GM_setValue = GM_setValue;
unsafeWindow.GM_deleteValue = GM_deleteValue;
unsafeWindow.GM_addStyle = GM_addStyle;
unsafeWindow.GM_notification = GM_notification;
unsafeWindow.GM_setClipboard = GM_setClipboard;
unsafeWindow.GM_registerMenuCommand = GM_registerMenuCommand;
unsafeWindow.unsafeWindow = unsafeWindow;
```

#### @connect白名单（⚠️ 必须维护）

TM的GM_xmlhttpRequest需要 `@connect` 声明才能访问跨域URL。
每次新增OCR后端或API端点，都必须更新dev.user.js的@connect列表并重新安装。

当前白名单:
```
@connect localhost
@connect api.ocr.space
@connect aip.baidubce.com
@connect cloud.tencent.com
@connect api.puter.com
@connect scauzj.leykeji.com
```

#### 验证热重载成功

**控制台日志链（正常情况）**:
```
[DevHotReload] 🔄 正在从 http://localhost:18923/... 获取最新脚本...
[DevHotReload] ✅ 脚本获取成功! 大小: 95.6KB
[DevHotReload] ✅ 脚本执行完成! 版本: unknown
[DevHotReload] ✅ GM_xmlhttpRequest: 已桥接          ← 关键！
[HotReload] ✅ 已是开发版本，跳过热重载检测
[Init] ✅ 优雅大师就绪, nodeId检测: true
```

**关键指标**:
- `[DevHotReload] ✅ GM_xmlhttpRequest: 已桥接` — 桥接成功
- `[NetworkClient] 使用 GM_xmlhttpRequest` — OCR API走GM通道（无CORS）
- ❌ 如果看到 `[NetworkClient] GM_xmlhttpRequest不可用，降级使用fetch` — 桥接失败！

#### 更新dev.user.js到TM

**方法**: 浏览器导航到 `http://localhost:18923/dev.user.js`
- TM会弹出"更新用户脚本"对话框
- 如果有新的@connect，会提示"至少添加一个新的 @connect 语句"
- 点击"更新"即可

**⚠️ BUG#13 已知问题**: TM编辑器的CodeMirror `setValue()` + Ctrl+S 不会持久化代码。
  → 永远不要用TM编辑器修改dev.user.js！用URL安装方式代替。

---

### 🛡️ 三重防循环机制（保留）

> **历史教训**: BUG#10 — 热重载无限循环导致3255+个脚本注入

防循环机制仍在主脚本中生效:
1. `currentScript.src` 检测 (是否已是dev版)
2. `__ELEGANT_MASTER_HR_COUNT` 计数器 (最多触发1次)
3. `__ELEGANT_MASTER_HOTRELOAD__` 全局标志
- `hrCount = 0`: 说明没有触发过热重载（因为第一重就拦截了）
- 日志条数: 应该只有7条左右（对比之前3255条的灾难）

---

### ✅ 热重载验证清单

每次修改脚本并热重载后，**必须**执行以下验证：

#### 基础验证（30秒内完成）

- [ ] **控制台无报错**: 打开F12 Console，确认没有红色错误
- [ ] **UI浮窗正常**: 右上角显示"优雅大师"面板，节点ID和时长正确
- [ ] **版本号正确**: 控制台显示 `[Init]✅v3.3-autologin`
- [ ] **单一实例**: 只有一个面板（不应该出现两个浮窗）

#### 功能验证（启动脚本后）

- [ ] **点击启动按钮**: 状态变为"运行中..."（绿色）
- [ ] **进度条递增**: 从0%向100%增长
- [ ] **上报日志**: 控制台每2秒出现 `上报:` 日志
- [ ] **自动下一节**: 完成后出现 `➡️ 自动点击下一节` 日志

#### 长程验证（可选但推荐）

- [ ] **页面刷新后**: 自动重新加载开发版（仅模式二）
- [ ] **连续3个节点**: 无内存泄漏、无DOM堆积
- [ ] **控制台日志量**: 正常情况下<50条（不是3255条！）

---

### 🔧 故障排除指南

| 问题现象 | 可能原因 | 解决方案 |
|---------|---------|---------|
| **注入后无反应** | HTTP服务器未启动 | 执行 `cd scripts && python -m http.server 18923` |
| **两个UI浮窗** | 旧版TM脚本+新版dev版共存 | 禁用TM中的旧版脚本，或使用Bootstrap模式 |
| **控制台3255+条日志** | 热重载无限循环 | 检查三重防护是否生效（见上文） |
| **版本显示v3.2而非v3.3** | 加载的是TM缓存旧版 | 清除TM缓存：扩展管理→清除浏览器缓存 |
| **页面刷新后脚本消失** | 使用的是模式一手动注入 | 改用模式二Bootstrap自动持久化 |
| **Bootstrap未生效** | 未安装引导器脚本 | 在TM中安装 `elegant-master-bootstrap.user.js` |
| **dev server离线提示** | 本地服务器未启动或端口被占用 | 启动服务器或检查端口18923是否被占用 |

---

### 📊 实战数据参考（来自SESSION-002-CONT验证）

**测试时间**: 2026-04-14 03:24 GMT+8  
**提交记录**: `935b4a4` (热重载持久化), `fd27fd7` (Bootstrap引导器)

**验证结果**:
- ✅ **控制台日志链完整**: `[Bootstrap]🔄...` → `[HotReload]✅...` → `[Init]✅v3.3...` → `[Bootstrap]✅...`
- ✅ **UI正常显示**: 节点=1429488, 时长=374s, 进度=16%, 状态=运行中
- ✅ **防循环验证通过**: hrCount=0, 仅7条新日志（vs 之前3255条灾难）
- ✅ **页面刷新持久化**: 刷新后自动加载开发版，无需手动注入

**性能指标**:
- Bootstrap检测耗时: <2秒（含超时容错）
- 开发版加载耗时: <1秒（局域网）
- 内存占用: 无明显增长（vs 手动注入模式的DOM堆积）

---

### ⛔ 禁止行为

- ❌ 修改源码后不热重载就测试 → **测的是旧版本，浪费时间**
- ❌ 用Playwright手动操作弥补脚本缺陷 → **治标不治本**
- ❌ 忽略三重防循环保护 → **可能导致浏览器卡死（3255+脚本）**
- ❌ 在生产环境开启dev server → **安全风险**
- ✅ **正确流程**: 改源码 → 热重载 → 观察脚本自主运行 → 发现bug → 再改 → 再重载
- ✅ **推荐工作流**: 启动dev server → 安装Bootstrap → 刷新页面 → 自动加载开发版 → 修改代码 → 刷新页面即可看到最新版

---

## ✅ 当前已就绪状态

- ⏸️ **登录页面**: 脚本未加载 → 先尝试用 OCR API（如有 API keys）→ 无 API keys 才手动输入
- ✅ 账号凭据已知: `REDACTED_USERNAME` / `REDACTED_PASSWORD`

---

## 🎯 执行路线图（按阶段推进）

### 阶段 1: 登录验证（5分钟）

**动作**:
1. `browser_snapshot` 查看登录表单
2. `browser_type` 输入验证码到 `ref=e28`（需提供4位数字）
3. `browser_click` 点击登录按钮 `ref=e38`
4. `browser_snapshot` 验证跳转到 `nodeId=1429487`

**成功标志**: URL 变为 `.../user/node?nodeId=1429487`

---

### 阶段 2: 脚本首次启动测试（15分钟）

**目标**: 验证油猴脚本的核心功能（启动 → 上报 → 完成 → 自动下一节）

**动作**:
1. 观察 UI 浮窗是否显示正确的 `nodeId` 和 `时长`（~440秒）
2. `browser_click` 点击 `🚀 启动` 按钮（`ref=e101`）**仅此一次**
3. **此后脚本应自主运行**，Playwright 只用于**观察**:
   - 每 5 秒执行 `browser_snapshot` 检查进度
   - 每 10 秒执行 `browser_console_messages` 读取日志
   - ❌ **绝不**用 Playwright 模拟脚本行为（如自动点击下一节）
4. 观察：
   - 状态文字是否变为 "运行中..."（绿色）
   - 进度条是否从 0% → 100% 自动递增
   - 控制台是否有 `上报:` 日志（每2秒一次）
   - 控制台是否有 `➡️ 自动点击下一节` 日志

**成功标志**: 进度达到 100%，脚本**自主完成**节点切换

**失败判断**: 如果脚本没有自动执行，而是需要 Playwright 持续干预 → 这是脚本缺陷，必须修复

---

### 阶段 3: SPA导航与自动续刷（10分钟）

**目标**: 验证脚本的 SPA 导航监听和自动重启能力

**动作**:
1. `browser_snapshot` 检查 URL 是否变为 `nodeId=1429488`
2. **继续等待**，观察脚本是否**自主重启**（日志显示 `🎯 目标:` + 新的 nodeId）
3. 重复观察，记录：
   - URL 变化后 UI 是否重置（进度条归零、状态保持运行）
   - 新节点的时长是否正确提取
   - 有无控制台错误

**成功标志**: 连续完成 ≥3 个节点，脚本全程自主运行，无 Playwright 干预

**关键检查**:
- ✅ 脚本自己检测到 `location.href` 变化
- ✅ 脚本自己调用 `restartBot()` 或重新初始化
- ❌ 如果没有自动重启，说明 URL 监听逻辑有问题，需修复

---

### 阶段 4: 热重载实战演练（15分钟）

**场景**: 脚本运行中注入新版本

**动作**:
1. 读取 `docs/hot_reload/main.js` 完整内容
2. 使用 `loadScript(code)` 模式注入（已完成GM Mock，只需注入主脚本）
3. 验证挂钩：修改颜色或日志字符串，观察是否生效
4. 测试修复能力：故意制造错误 → 热修复 → 验证恢复

**成功标志**: 热更新后功能立即生效，无需刷新

---

### 阶段 5: 长程稳定性验证（**核心测试**）

**⚠️ 必须完成**: 循环测试直到所有课程刷完，验证真实使用场景下的稳定性

**原因**: 蓝队设置了强制下线和中途验证码，单节点测试无法暴露长程问题

**动作**:
1. 确保脚本配置为**自动下一节**（checkbox 已勾选）
2. 让脚本持续运行，直到：
   - 当前课程所有节点完成 ✅
   - 或触发强制下线/验证码 ⚠️
   - 或脚本崩溃 ❌
3. 观察并记录：
   - 中途是否触发 captcha（验证码弹窗）
   - Cookie 是否过期导致强制跳转登录
   - 内存是否持续增长（DOM 节点堆积）
   - UI 浮窗是否漂移或重复创建
   - SPA 导航是否在第 N 次后失效

**成功标志**:
- ✅ 自动完成一个课程的所有节点（无需手动干预）
- ✅ 自动跳转到下一个课程的节点（增强脚本的自动性）
- ✅ 运行时长 ≥1 小时无内存泄漏
- ✅ 遇到异常（下线/captcha）能正确处理或明确提示

---

### 阶段 6: 自动性增强验证（15分钟）

**测试目标**: 脚本是否具备"一键完成所有课程"的能力

**当前脚本能力评估**（对照 `docs/red_team/REDTEAM-TESTING-GUIDE.md`）:
- [ ] 课程列表自动获取（侧边栏或 API）
- [ ] 自动识别未完成课程
- [ ] 自动顺序执行所有节点
- [ ] 课程间自动切换
- [ ] 完成后给出总结（共完成X门课程，Y个节点）

**如果缺少上述能力**:
- 自主读 `docs/hot_reload/main.js` 的 `MasterController` 类
- 补充 `enumerateCourses()` 和 `autoNextCourse()` 方法
- 热重载验证新功能

---

### 阶段 7: 用户体验评估 + BUG修复（30分钟）

**自主发现并修复**:

**UI/UX 检查清单**:
- [ ] 浮窗固定在右上角是否会遮挡页面内容？
- [ ] 进度条平滑度如何？是否需要动画优化？
- [ ] 错误发生时用户是否能感知？（还是只在console？）
- [ ] 滑块操作是否顺手？实时保存反馈是否清晰？
- [ ] 面板是否可最小化/拖拽？（若无则添加）

**关键BUG检查**（对照 `docs/red_team/vulnerability-report.md`）:
- [ ] `buildAdvancedSection` 是否定义？（若未定义需修复）
- [ ] API 调用是否真实有效？（当前Mock版需启用真实API）
- [ ] captcha 检测逻辑是否健壮？

**你自主决定**: 哪些改进必须立即实现，哪些可以暂缓

---

## 🛠️ 你的工具箱

### 🔥 热重载操作流程（必会）

每次修改 `scripts/elegant-master-study.user.js` 后，按此流程热重载：

**步骤 1**: 确保本地 HTTP 服务器在运行（端口 18923）
```bash
# 在新终端执行（如果服务器没启动）
cd D:/Working/programming_projects/leykeji-autostudy/scripts
python -m http.server 18923

# 验证：浏览器访问 http://localhost:18923/elegant-master-study.user.js 应显示代码
```

**步骤 2**: 在 Playwright 浏览器控制台（Console）中执行注入
```javascript
// 完整热重载命令（一次性执行）
page.addScriptTag({ url: 'http://localhost:18923/elegant-master-study.user.js' })
  .then(() => console.log('✅ 热重载成功'))
  .catch(err => console.error('❌ 热重载失败:', err));
```

**步骤 3**: 验证注入生效
```javascript
// 在 Console 中执行以下任一检查
console.log('MasterEngine:', window.MasterEngine !== undefined);  // true = 成功
console.log('UI面板:', document.getElementById('elegant-master-panel') !== null);  // true = UI已加载
console.log('playBot状态:', window.MasterEngine?.playBot?.isRunning);  // 查看运行状态
```

**⚠️ 重要提醒**:
- ❌ 不要刷新页面（热重载的目的就是避免刷新）
- ❌ 不要重复注入（每次修改后只需执行一次）
- ✅ 如果注入失败，先检查 HTTP 服务器是否在运行
- ✅ 注入后观察 Console 是否有新的脚本日志（说明新版本起作用）

---

### 📦 常用 Playwright 命令

```javascript
// 获取当前页面快照（观察UI状态）
await browser_snapshot();

// 读取控制台日志（检查脚本输出）
const logs = await browser_console_messages('info');
console.log(logs);

// 点击按钮（仅用于启动，之后脚本自主运行）
await browser_click({ ref: 'e101' });  // 🚀 启动按钮
```

---

### 🔧 调试辅助命令（在浏览器 Console 执行）

```javascript
// 检查环境
console.log('hasGM:', typeof GM !== 'undefined');
console.log('localStorage:', window.__GM_STORAGE__);
console.log('config:', window.ElegantMaster?.config);

// 重建 UI（如果浮窗异常）
window.ElegantMaster?.rebuild?.();

// 强制重启脚本（如 SPA 导航后未自动重启）
window.MasterEngine?.restartBot?.();

// 查看当前学习状态
console.log('当前节点:', window.MasterEngine?.currentNodeId);
console.log('剩余时长:', window.MasterEngine?.remainingDuration);
console.log('上报次数:', window.MasterEngine?.reportCount);
```

---

### 📚 文件路径速查

| 文件 | 用途 | 修改后操作 |
|------|-----|-----------|
| `scripts/elegant-master-study.user.js` | 主脚本（直接注入） | 热重载（loadScript） |
| `docs/hot_reload/main.js` | 热重加载体 | 热重载（loadScript） |
| `config/api_key.txt` | OCR API keys | 重启脚本（重新加载配置） |
| `worklog.md` | 工作日志 | 每次阶段完成后手动追加记录 |

---

## 🚨 应对异常（自主处理）

| 问题 | 表现 | 你的应对 |
|------|------|----------|
| **热重载失败** | `page.addScriptTag` 报错 / 404 | 1. 检查 HTTP 服务器是否运行<br>2.  curl http://localhost:18923/elegant-master-study.user.js 验证<br>3. 重新执行注入 |
| **分段注入失败** | `ReferenceError: X is not defined` | **必须**改用单次完整注入 or `loadScript(code)` |
| **UI 显示异常** | 浮窗残缺/错位 | 刷新页面 → 重新注入完整代码 |
| **节点卡在 `--`** | 环境检测超时 | 检查 `document.title` 或 `.node` 元素 |
| **API 全部 403** | 会话过期 | 刷新页面重新登录 |
| **验证码不识别** | OCR 失败 | **先完善脚本 OCR，再热重载测试（禁止用 Playwright 读图）** |

**黄金法则**: 如果连续 3 次失败，停止并分析原因（读代码、看日志），不要盲目重试。

---

## 📋 交付物（完成时）

1. ✅ 所有阶段测试通过（阶段1-4）
2. ✅ 至少 1 次热重载验证成功
3. ✅ GitHub 提交：
   - `main.js` 的所有修复
   - 本测试记录的更新（新增你的测试日志）
   - 提交信息格式: `git add -A && git commit -m "红队实测: 描述"`
4. ✅ 文档更新:
   - 更新 `worklog.md` 追加你的测试记录（时间戳+现象+结论）
   - 如有新发现，添加到 `docs/red_team/vulnerability-report.md`

---

## 📚 红队文档速览（按需阅读）

| 文档 | 核心内容 | 何时看 |
|------|---------|--------|
| **REDTEAM-TESTING-GUIDE.md** | 蓝队真实能力评估 + 18个检测盲区矩阵（95%置信度） | 需要战术决策时 |
| **threat-model-attack-chain.md** | 攻击链分析：MITRE ATT&CK框架，10个漏洞串联路径 | 理解系统全貌时 |
| **vulnerability-report.md** | 10个漏洞详情（2严重/3高危/3中危/2低危），安全评分10/100 | 查看具体漏洞复现 |
| **docs/ocr/ocrEngine.md** | OCR 降级链实现（百度/腾讯/Puter/Tesseract/GLM-4V） | **所有涉及验证码/OCR处统一引用此文** |

---

## 📌 关键约定

### OCR降级链统一引用

> 所有红队文档中涉及验证码/OCR处，统一表述为"**OCR降级链（详见 docs/ocr/ocrEngine.md）**"  
> 具体实现细节维护在 `docs/ocr/ocrEngine.md`，禁止硬编码到其他文档

### Playwright MCP边界

- ✅ 用途：模拟人类操作 + 代码调试
- ❌ 用途：**不能**用于实现刷课逻辑（脚本必须独立运行）

### 工作流正确顺序

```
改源码 → 热重载 → 观察脚本自主运行 → 发现bug → 再改 → 再重载
```

---

## 🚀 现在开始

**第一步**:
1. 查看浏览器当前页面，确认在登录页
2. 输入验证码（**手动输入，这是唯一合法的人工介入点**）
3. 登录并跳转到目标视频节点

**记住**: 你是红队，大胆测试，自主决策，记录一切发现。每次阶段完成后立即更新 `worklog.md`。

**祝实战顺利！**
## 🚨 应对异常（自主处理）

| 问题 | 表现 | 你的应对 |
|------|------|----------|
| 分段注入失败 | `ReferenceError: X is not defined` | **必须**改用单次完整注入 or `loadScript` |
| UI 显示异常 | 浮窗残缺/错位 | 刷新页面 → 重新注入完整代码 |
| 节点卡在 `--` | 环境检测超时 | 检查 `document.title` 或 `.node` 元素 |
| API 全部 403 | 会话过期 | 刷新页面重新登录 |
| 验证码不识别 | OCR 失败 | **先完善脚本 OCR，再热重载测试（禁止用 Playwright 读图）** |

**黄金法则**: 如果连续 3 次失败，停止并分析原因（读代码、看日志），不要盲目重试。

---

## 📋 交付物（完成时）

1. ✅ 所有阶段测试通过（阶段1-4）
2. ✅ 至少 1 次热重载验证成功
3. ✅ GitHub 提交：
   - `main.js` 的所有修复
   - 本测试记录的更新（新增你的测试日志）
   - 提交信息格式: `git add -A && git commit -m "红队实测: 描述"`
4. ✅ 文档更新:
   - 更新 `worklog.md` 追加你的测试记录（时间戳+现象+结论）
   - 如有新发现，添加到 `docs/red_team/vulnerability-report.md`

---

## 📚 红队文档速览（按需阅读）

| 文档 | 核心内容 | 何时看 |
|------|---------|--------|
| **REDTEAM-TESTING-GUIDE.md** | 蓝队真实能力评估 + 18个检测盲区矩阵（95%置信度） | 需要战术决策时 |
| **threat-model-attack-chain.md** | 攻击链分析：MITRE ATT&CK框架，10个漏洞串联路径 | 理解系统全貌时 |
| **vulnerability-report.md** | 10个漏洞详情（2严重/3高危/3中危/2低危），安全评分10/100 | 查看具体漏洞复现 |
| **docs/ocr/ocrEngine.md** | OCR 降级链实现（百度/腾讯/Puter/Tesseract/GLM-4V） | **所有涉及验证码/OCR处统一引用此文** |


## 🚀 发布可用性要求（面向普通红队成员）

这个脚本要发布给普通红队成员使用，必须满足以下要求：

### 1. 零门槛安装
- ✅ 用户只需：① 安装 Tampermonkey ② 点击"安装脚本" ③ 打开目标网站
- ❌ 不能要求用户：安装 Node.js、npm install、运行 build 命令、配置 Webpack/Vite
- ❌ 不能要求用户：下载模型文件、安装 Python 依赖、配置环境变量

### 2. 单文件交付原则
- ✅ 所有代码在一个 `.user.js` 文件中（已使用 IIFE 隔离）
- ✅ 不依赖外部 CDN（所有库内嵌或动态加载）
- ✅ 现代浏览器的内置 API 优先：fetch、Blob、URL、localStorage

### 3. 配置外置化
- ✅ API keys 存储在 `config/api_key.txt` 或用户自行粘贴
- ✅ 默认配置：开箱即用（无 API keys 时走 Puter.js/Tesseract.js）
- ❌ 不在代码中硬编码任何可能失效的 keys

### 4. 模型本地化优先
- ✅ Puter.js、Tesseract.js 无需下载模型（动态加载）
- ✅ 避免用户去各平台的开发者中心申请 API keys
- ⚠️ 第三方 API（百度/腾讯/OCR.space）作为降级选项，非必需

### 5. 用户友好提示
- ✅ 所有错误有可操作的前端提示（不是只在 console）
- ✅ API keys 缺失时明确告知"去官网申请 key 并粘贴到 config/api_key.txt"
- ✅ 提供"一键测试"按钮验证 OCR 功能

### 6. 测试沙盒化
- ✅ Playwright 仅用于开发调试（红队成员自己用不到）
- ✅ 脚本不依赖 Playwright API（独立运行）
- ✅ 功能验证通过后再发布（不要发半成品给普通成员）

### 可用性检查清单（发布前必须检查）
- [ ] 一台全新电脑（无开发环境），只需浏览器 + Tampermonkey 能否运行？
- [ ] 是否需要用户去 GitHub 下载额外文件？→ 应该内嵌或动态加载
- [ ] 是否需要用户注册第三方账号获取 API keys？→ 应该提供无 key 方案
- [ ] UI 浮窗是否遮挡页面？→ 应该可拖拽/最小化
- [ ] 错误提示是否明确？→ 应该告诉用户"怎么办"而不是"出错了"

---

---

## 📌 关键约定

### OCR降级链统一引用

> 所有红队文档中涉及验证码/OCR处，统一表述为"**OCR降级链（详见 docs/ocr/ocrEngine.md）**"
> 具体实现细节维护在 `docs/ocr/ocrEngine.md`，禁止硬编码到其他文档

### Playwright MCP边界

- ✅ 用途：模拟人类操作 + 代码调试
- ❌ 用途：**不能**用于实现刷课逻辑（脚本必须独立运行）

### 工作流正确顺序

```
改源码 → 热重载 → 观察脚本自主运行 → 发现bug → 再改 → 再重载
```

---

## 🚀 现在开始

**第一步**:
1. 查看浏览器当前页面，确认在登录页
2. 输入验证码 → 先用脚本 OCR API（有 keys）→ 无 keys 才手动输入（极少情况）
3. 登录并跳转到目标视频节点

**记住**: 你是红队，大胆测试，自主决策，记录一切发现。每次阶段完成后立即更新 `worklog.md`。

**祝实战顺利！**