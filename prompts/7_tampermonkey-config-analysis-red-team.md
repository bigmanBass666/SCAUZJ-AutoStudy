# 🎯 Tampermonkey 设置页安全审计 Prompt

**角色**: 红队安全研究员（高级）
**任务**: 分析 Tampermonkey 设置页面 HTML，识别所有配置项及其对刷课脚本的影响
**目标**: 最大化刷课成功率，最小化被蓝队检测风险

---

## 📋 输入材料

你将收到一个 HTML 文件内容，这是 Tampermonkey `chrome-extension://.../options.html` 的设置页面源码。

---

## 🔍 分析框架

### 1. 配置项识别与分类

对每个 `<input>`, `<select>`, `<checkbox>`, `<textarea>` 元素：

**必提取信息**:
- `id` / `name` - 配置项唯一标识
- 关联的 `<label>` 文本 - 用户可见的描述
- 附近的帮助文本 (`<small>`, `title`, `data-tooltip` 等)
- 默认值 (`checked`, `value`, `selected`)
- 选项列表（如果是 `<select>`）

**分类标签**（每个配置项归入1-N类）:
- 🔴 **检测规避** - 直接影响蓝队检测能力的设置
- 🟠 **稳定性** - 影响脚本运行稳定性的配置
- 🟡 **性能** - 资源占用、性能影响
- 🟢 **便利性** - 用户体验相关
- ⚪ **无关项** - 与刷课无关的设置

---

### 2. 红队优先级评估矩阵

对每个**相关配置项**评估：

| 维度 | 说明 | 评分 |
|------|------|------|
| **影响程度** | 该设置对刷课成功率的影响 | 🔴高/🟠中/🟢低 |
| **检测风险** | 异常设置可能触发蓝队注意的概率 | 🔴高/🟠中/🟢低 |
| **启用优先级** | 是否应该开启（是/否/条件开启） | ✅/❌/⚠️ |
| **理由** | 为什么这样建议（引用具体行为） | 文本 |

---

### 3. 关键配置项识别

重点关注以下机制的Tampermonkey设置：

#### A. 脚本运行环境
- `@grant` 权限（GM_* 函数可用性）
- `@connect` 跨域白名单
- `@run-at` 脚本注入时机
- `@require` 外部依赖加载
- `@noframes` 是否在iframe中运行

#### B. 沙箱与隔离
- `sandbox` 设置（是否启用隔离）
- `@noframes` 跨帧脚本隔离
- `@inject-into` (content vs page)

#### C. 网络请求
- `GM_xmlhttpRequest` 是否可用
- CORS 处理
- 请求头修改权限

#### D. 存储与持久化
- `GM_setValue` / `GM_getValue` 数据存储位置
- `localStorage` vs `GM_storage` 差异
- 并行会话检测（localStorage key 机制）

#### E. 检测规避相关
- 用户脚本元数据暴露（`@name`, `@namespace` 是否被平台读取）
- `@include` / `@match` 模式是否过于宽泛
- `@exclude` 避免在特定页面运行（如管理后台）
- `@homepageURL` 是否暴露作者信息

---

### 4. 配置组合策略

针对**刷课场景**，给出推荐的完整配置组合：

```javascript
// ==UserScript==
// @name          优雅大师 - 无痕刷课助手（红队优化版）
// @namespace     http://tampermonkey.net/
// @version       1.0.0
// @description   自动刷课 - 红队最小化检测风险配置
// @author        红队AI
// @match         https://scauzj.leykeji.com/user/node*
// @grant         GM_setValue
// @grant         GM_getValue
// @grant         GM_xmlhttpRequest
// @grant         GM_notification
// @connect       scauzj.leykeji.com
// @connect       open.bigmodel.cn  // GLM-4V-Flash API
// @run-at        document-end
// @inject-into   page              // 避免 content script 隔离
// @noframes      false              // 允许在iframe运行（课程可能在iframe）
// @compatible    chrome
// ==/UserScript==
```

**你需补充**:
1. 默认配置中哪些应该**禁用**（为什么）
2. 哪些应该**启用**（为什么）
3. 哪些需要**自定义**（如 @match 模式精确化）
4. `@noframes` 与 iframe 课程的冲突分析

---

### 5. 蓝队检测视角

站在蓝队角度，回答:

| 问题 | 答案 | 证据 |
|------|------|------|
| Tampermonkey 会在页面留下什么痕迹？ | - | `navigator.plugins`, `window.Tampermonkey` |
| 设置中的异常值可被前端探测吗？ | - | `localStorage.setItem` 的 key 特征 |
| @grant 缺失会如何影响脚本功能？ | - | `GM_* is not defined` |
| @run-at document-start 有风险吗？ | - | 可能在页面JS加载前执行，被检测到 |

---

## 📤 输出格式

```markdown
# Tampermonkey 设置页安全审计报告

## 执行摘要
- 总配置项数: X
- 红队相关项: Y
- 建议开启: Z
- 建议禁用: W

---

## 高风险配置项（必须修改）

| ID | 配置项 | 当前值 | 红队建议 | 理由 |
|-----|--------|--------|----------|------|
| T-001 | sandbox | true | ❌ 改为 false | 隔离模式阻止直接DOM操作 |

---

## 推荐配置组合

```javascript
// ==UserScript==
// @name          ...
// @match         ...
// @grant         ...
// ...
// ==/UserScript==
```

---

## 逐项分析表

| 配置ID | 分类 | 影响度 | 风险度 | 建议 | 理由 |
|--------|------|--------|--------|------|------|
| ... | 检测规避 / 稳定性 | 🔴高 | 🟢低 | ✅ 开启 | 说明 |

---

## 蓝队检测面分析

Tampermonkey 在页面中可能暴露的痕迹:
1. ...
2. ...

---

## 最终建议

**一句话总结**: [你的核心建议]
```

---

## ⚠️ 注意

1. **不要假设默认配置安全** - 默认设置可能是开发便利优先，而非红队优化
2. **优先实战** - 若某些设置即使理论有风险但实际无检测，可放宽
3. **证据导向** - 引用 `vulnerability-report.md` 中的检测盲区来支持建议
4. **可解释性** - 每个建议必须有明确理由（"这会影响GM_xmlhttpRequest可用性"）

---

## 🎯 你的任务

收到 HTML 内容后:
1. 解析所有表单控件及其属性
2. 对照上述框架逐项分析
3. 生成完整的审计报告（使用指定输出格式）
4. **特别注意**: 关注 `@grant`, `@connect`, `@run-at`, `@noframes`, `sandbox` 等核心设置

**交付物**: 完整的 Markdown 审计报告（追加到本文件或另存为新文件）

---

**红队指挥官**: "最大化成功率，最小化风险。Go!"
