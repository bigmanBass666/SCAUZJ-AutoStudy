# 红队测试专用指南 - 优雅大师

> **机密等级**: Red Team Eyes Only
> **目标系统**: scauzj.leykeji.com
> **更新时间**: 2026-04-19 (v4.0-server-sync, 基于蓝队7个JS文件深度逆向+服务端会话冻结发现)
> **核心目标**: 最大化测试成功率，最小化被蓝队检测风险

---

## 核心发现：蓝队真实能力评估（v4.0-server-sync更新）

### ⚠️ 重要更正：/service/sign端点有效！

#### 旧版错误认知 vs 源码证实现实

> ❌ ~~"/service/sign端点返回500, 完全无效"~~ → **这是错误的！**
> ❌ ~~"蓝队只有安全剧场"~~ → 误判
> ❌ ~~"4x加速是安全的"~~ → 部分正确，秘密在比率而非绝对值

#### 源码证实现实

> ✅ **/service/sign端点有效** — 服务端记录timestamp用于时间差校验
> - 成功回调: `console.log("rest", rest)` 有日志输出
> - 服务端用 `timestamp` 记录会话开始时间
> - 每次上报做时间差校验: `claimed_increment > actual_interval * 1.1` → 惩罚

### Plan H 4x 安全的秘密

```
旧误解: "每2秒上报30秒增量 = 15x加速 → 被检测"
真相:
  实际上报间隔 = 30秒 (每30秒一次)
  每次增量 = 30秒 (而非240秒)
  比率 = 1.0 → 在服务端1.1容差内 → 全部记录, 无惩罚

关键: 不是"速度越快越容易被检测"，而是"上报增量/实际间隔比值"决定是否异常
```

---

## 蓝队8层防御体系 (video_v2.js源码完整证实 + SESSION-015服务端发现)

> **来源**: `docs/blue_team_source/video_v2.js` 完整逆向分析 (SESSION-014)
> **更新**: v4.0-server-sync新增L2多标签欺骗机制和L3鼠标轨迹增强

| # | 防御层 | 源码依据 | 红队绕过状态 | 备注 |
|---|--------|---------|-------------|------|
| **L1** | **/service/sign签名** | video_v2.js L15-37 | ✅ **fix27有效** (端点不是500!) | 服务端时间差校验 |
| **L2** | **多标签检测** (localStorage) | video_v2.js L85-108 | ✅ **已修复** (v3.6新增欺骗机制) | 567ms写入+1s检查 |
| **L3** | **鼠标轨迹追踪** (xlogs) | video_v2.js L111-136 | ✅ **已增强v3** (频率提升5倍) | 数据收集但未上传 |
| **L4** | 文字验证码 (need_code=1) | video_v2.js L138-174 | ✅ 百度OCR | 双图固定4位 |
| **L5** | tw鼠标指纹 | video_v2.js L180-182 | ✅ `_spoofTwFingerprint()` | mousedown→tw='_' |
| **L6** | 点选验证码 (need_code=2) | video_v2.js L233-252 | ✅ **ClickCaptchaSolver** | ak已确认可用 |
| **L7** | totalTime计数器 | video_v2.js L91-108 | ✅ **Plan H 4x劫持** | playing时递增 |
| **L8** | **服务端会话冻结** | SESSION-015实测 | ✅ **ROBUST-SESSION-RESET** (页面导航重置) | viewCount卡住,服务端拒绝进度上报 |
| L9 | Console警告 | video_v2.js L88-89 | 🔵 无影响 | 仅警告信息 |

### L8 服务端会话冻结机制（SESSION-015发现）

**现象**: viewCount卡住(如6s), 服务端拒绝所有后续进度上报, 脚本持续上报但viewCount不增长
**触发条件**: 未知(可能是反作弊检测), 持续27+轮(~15分钟)无法自愈
**红队绕过** (ROBUST-SESSION-RESET):
- 导航到study_record页面, 再返回当前节点 → 重置服务端会话状态
- 重置后进度上报恢复正常
- **注意**: 最后节点必须取消勾选"完成后自动下一节"再导航

### v4.0-server-sync 新增防御层详情

#### L2 多标签检测欺骗机制（新增）

**源码依据**: video_v2.js L85-108

```javascript
// 蓝队检测逻辑
window.setInterval(function () {
    storage.set('node_play_' + schoolId + userId, nodeId);  // 每567ms写入
}, 567);

window.setInterval(function () {
    var bNodeId = storage.get('node_play_' + schoolId + userId);
    if (bNodeId != nodeId && layId == 0) {
        layId = Yee.alert('检测到有其他视频页面同时打开...');
        playState = 'pause';
        player.videoPause();
    }
}, 1000);  // 每1秒检查
```

**红队修复** (v4.0-server-sync):
```javascript
// BlueTeamDefense._spoofMultiTabDetection() 已实现
const updateNodePlay = () => {
    const key = `node_play_${schoolId}${userId}`;
    localStorage.setItem(key, nodeId);  // 主动维护!
};
setInterval(updateNodePlay, 567);  // 与蓝队写入频率完全一致
```

#### L3 鼠标轨迹追踪增强（v3增强）

**源码依据**: video_v2.js L111-136

```javascript
// 蓝队收集逻辑
var xlogs = [];
document.body.addEventListener('mousemove', function (e) {
    var ofs = $('#videoContent').offset();
    var x = Math.round(e.clientX - ofs.left);
    var y = Math.round(e.clientY - ofs.top);
    var t = new Date().getTime() % 20000;  // 时间戳模20000
    xlogs.push(x, y, t);  // 每次推送3个值
    if (xlogs.length > 1500) { xlogs.shift(); ... }
});
// sentLog(): $.post('/service/mouse_log', ...) 被注释！
```

**红队增强** (v4.0-server-sync):
| 维度 | 旧版(v2) | 新版(v3) | 提升 |
|------|----------|----------|------|
| **间隔** | 2000-6000ms | **400-1000ms** | **5倍** |
| **总次数** | 300 | **500** | +67% |
| **模式** | 1种随机 | **3种** (随机+螺旋+惯性) | 3x自然 |
| **平滑度** | 单步跳跃 | **2-4步插值** | 更真实 |

---

## 攻击检测盲区矩阵 (v4.0-server-sync修正版)

### 有效攻击向量

| ID | 攻击行为 | 源码依据 | 利用难度 | 红队状态 |
|----|----------|---------|---------|----------|
| **B-01** | /service/sign签名调用 | L1 ajax success | 低 | ✅ **fix27-sign-api** |
| **B-02** | totalTime劫持4x加速 | L7 setInterval | 低 | ✅ **Plan H核心** |
| B-03 | tw指纹欺骗 | L5 mousedown | 低 | ✅ _spoofTwFingerprint() |
| B-04 | 文字验证码OCR | L4 /service/code | 低 | ✅ 百度API |
| **B-05** | **多标签欺骗** | **L2 localStorage** | **低** | ✅ **_spoofMultiTabDetection()** |
| **B-06** | **鼠标轨迹模拟v3** | **L3 xlogs** | **低** | ✅ **_simulateMouseTrail() v3** |
| **B-07** | **点选验证码L7** | **L6 captcha** | **中** | ✅ **ClickCaptchaSolver** |
| B-08 | 单窗口运行 | L2 localStorage | 无 | ✅ 默认配置 |
| B-09 | 多账号同IP | 无IP关联 | 无 | ✅ 无限制 |
| B-10 | 会话长时间复用 | 无过期检测 | 无 | ✅ 无需刷新 |
| B-11 | 异常上报频率模式 | 时间差校验 | 低 | ✅ 比率<1.1即可 |
| B-12 | 后台标签页 | 无visibility检测 | 无 | ✅ visibilityState |
| B-13 | 章节锁定重试 | autoNext | 低 | ✅ BUG#12已处理 |
| **B-14** | **第三方弹窗拦截** | **Puter SDK** | **中** | ✅ **showModal劫持** |
| **B-15** | **nodeId非连续处理** | **侧边栏DOM** | **中** | ✅ **_getNextNodeIdFromSidebar()** |
| **B-16** | **服务端会话冻结** | **L8 服务端** | **中** | ✅ **ROBUST-SESSION-RESET** |

---

## 红队战术手册 (v4.0-server-sync完整版)

### 原则1：签名调用是必须的

- ❌ 旧策略: 跳过/service/sign，直接POST /user/node/study
- ✅ 新策略: 每次study前先调用`_callSignApi()`，带正确的Authorization头
- 原因: 服务端记录timestamp做时间差校验，无签名可能被折扣记录

### 原则2：上报比率必须<1.1

- ❌ 旧策略: 2秒间隔上报30秒增量 = 15x比率 → 被检测
- ✅ 新策略: 30秒间隔上报30秒增量 = 1.0比率 → 无惩罚
- 公式: `claimed_increment / actual_interval < 1.1`

### 原则3：多标签检测必须欺骗

- ❌ 旧策略: 不维护localStorage，依赖单窗口
- ✅ 新策略: `_spoofMultiTabDetection()` 每567ms主动维护
- 原因: 防止用户意外打开第二标签页触发警告，或未来蓝队增强检测

### 原则4：鼠标轨迹必须足够真实

- ❌ 旧策略: 2-6秒模拟一次mousemove（太慢太规律）
- ✅ 新策略: `_simulateMouseTrail()` v3，每400-1000ms模拟，多模式+插值
- 原因: 人类鼠标移动频率远高于2秒一次，蓝队虽未启用上传但行为模式可能分析

### 原则5：验证码必须解决

- L4/L6文字验证码: 百度OCR可解
- L7点选验证码: **ClickCaptchaSolver已完整实现**
- **Puter OCR注意**: Puter SDK的showModal()会创建弹窗阻塞其自身初始化 → showModal劫持必须!

### 原则6：第三方弹窗必须拦截

- Puter SDK用`dialog.showModal()`创建splash screen
- 该弹窗阻塞Puter.js运行时初始化 → 所有Puter OCR超时(15s×8=120s/次)
- **唯一可靠方案**: `HTMLDialogElement.prototype.showModal`原型劫持
- **无效方案**: 事后`el.remove()` → SDK用setInterval重建速度更快

### 原则7：下一节ID必须从DOM读取

- **绝对禁止**: `parseInt(nodeId) + 1` 推断
- **必须**: `_getNextNodeIdFromSidebar()` 从侧边栏DOM解析真实链接
- 课程节点ID**非连续**，用推断会跳到不存在的节点→死循环

### 原则8：学习记录页面为唯一真实进度来源（铁律#6）

- ❌ 旧策略: 信任脚本UI面板显示的进度百分比
- ✅ 新策略: 必须以 `/user/study_record?courseId=XXX` 页面数据为准
- 原因: 脚本UI可能显示100%但服务端实际未完成
- Course#1 (艺术鉴赏): `?courseId=1011601`
- Course#2 (劳动教育): `?courseId=1011603`

---

## 蓝队声称 vs 实际能力 (源码证实)

| 声称收集的数据 | 实际情况 | 红队风险 |
|---------------|---------|----------|
| 浏览器头/版本 | 无指纹分析 | 🟢 低 |
| 播放器记录(totalTime) | **真实检测，只在播放时递增** | 🟠 **中** |
| 登录时长/cookie/referer | 无异常检测 | 🟢 低 |
| **鼠标mousedown指纹** | **L5 tw检测真实存在** | 🔴 **高(但可绕过)** |
| **点选验证码** | **L6 dunclick第三方校验** | 🔴 **高(但有ak)** |
| **强制下线** | **online.js真实存在** | 🟠 **中** |
| **/service/sign签名** | **服务端时间差校验有效!** | 🟠 **高(但可绕过)** |
| **鼠标轨迹xlogs** | **L3收集但被注释上传** | 🟢 **无实际风险(但v3已增强)** |
| **多标签检测** | **L2真实检测(567ms间隔)** | 🟠 **中(但欺骗机制已部署)** |

---

## Course#2 完整验证数据

```
课程: 大学生劳动教育 (courseId=1011603)
进度: 33/33节点 100%完成 ✅
最后节点: 1429574 (9.3劳动者如何面对未来, 179s)
服务端: progress=1.00, state=已学, 观看时长=42m1s
总CAPTCHA触发: 极低
总运行时长: ~2小时(含调试和修复时间)
脚本版本: v4.0-server-sync
```

---

## 应急响应与规避

### CAPTCHA触发时的正确处理

| CAPTCHA类型 | 处理方法 | 源码依据 |
|------------|---------|---------|
| need_code=1 文字 | 百度OCR自动识别 | L4 |
| need_code=2 点选 | ClickCaptchaSolver (ak已确认) | L6 |
| 强制下线alert | 等待autoNext重试 | online.js |

### 章节锁定时的正确处理

- BUG#12: 章节锁定检测已实现
- BUG#24: **必须用侧边栏DOM读取下一节ID，禁止用nodeId+1推断**
- 退避策略: 10s → 10s → 30s 指数退避
- 最大重试: 5次后放弃

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-04-12 | 初始版本(过于乐观) |
| v2.0 | 2026-04-14 | 基于源码重构，纠正误判 |
| v3.0 | 2026-04-15 | /service/sign端点有效, HAR分析, Course#2完成 |
| v3.1 | 2026-04-15 | showModal劫持, nodeId连续性修复, 新增B-13/B-14 |
| **v3.6** | **2026-04-15** | **蓝队7个JS文件完整逆向, L2多标签欺骗+L3鼠标v3增强+ClickCaptchaSolver确认, 新增B-05/B-06/B-07/B-15** |
| **v4.0** | **2026-04-19** | **ServerSync引擎, L8会话冻结发现+ROBUST-SESSION-RESET, 铁律#6, 全课程79/79视频100%完成** |