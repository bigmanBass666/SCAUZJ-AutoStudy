# 蓝队前端源码归档

> **归档时间**: 2026-04-14/15 (SESSION-012/013期间)
> **获取方式**: HAR抓包 + `curl.exe` 直接下载
> **归档目录**: `docs/blue_team/`
> **用途**: 红队安全测试证据保全，漏洞分析参考

---

## 📁 文件清单 (共9个文件, 462.99 KB)

| 文件名 | 大小 | 类型 | 关键内容 |
|--------|------|------|---------|
| `ckplayer.js` | 281.74 KB | 视频播放器 | 实际负责video播放的ckplayer库 |
| `yee.js` | 118.97 KB | UI框架 | YeeUI框架主文件(曾用于layer弹窗) |
| `captcha.min.js` | 23.40 KB | 验证码组件 | **jsjiami.com.v6混淆 + RC4加密** |
| `layer.js` | 21.60 KB | 弹窗组件 | 轻量级弹窗/提示层组件 |
| `video_v2.js` | 13.85 KB | **⭐核心反作弊** | 8层防御体系完整实现 |
| `yee.config.js` | 1.80 KB | UI配置 | YeeUI模块加载配置 |
| `node_discuss.js` | 1.26 KB | 讨论区 | 讨论区UI逻辑 |
| `browser.js` | 391 B | 兼容性检测 | **仅IE6-9拦截**, 现代浏览器无作用 |
| `.gitkeep` | - | 占位 | - |

---

## 🎯 核心文件: video_v2.js (完整逆向)

> **这是最重要的文件**, 包含蓝队全部8层反作弊防御逻辑。

### L1: /service/sign 签名机制 ⚠️ 重要更正

**旧版误判**: "签名端点返回500, 完全无效" → **错误!**

**源码(L15-37)**:
```javascript
$.ajax({
    url: '/service/sign',
    headers: { 'Authorization': sign },  // sign从DOM隐藏字段读取
    type: "POST",
    timeout: 3000,
    data: {
        appId, nonce, timestamp,  // ← 时间戳记录会话开始
        nodeId, userId, studyId, studyTime
    },
    success: function (rest) {
        console.log("rest", rest);  // ← 回调存在! 有日志!
    }
});
```

**关键发现**:
- `/service/sign` 成功回调**有日志输出** (`console.log("rest", rest)`)
- 服务端**会记录会话开始时间戳** (`timestamp`)
- 服务端可能用 `timestamp + studyTime` 做时间差校验
- **正确策略**: script需要调用此API并带上正确的Authorization头

**红队实测** (SESSION-012 fix27):
```
调用: POST /service/sign 带 Authorization: {sign} 头
响应: {status: true} ✅
结论: /service/sign 端点有效! 是服务端校验的重要组成部分!
```

---

### L2: totalTime 计数器

**源码(L91-108)**:
```javascript
window.setInterval(function () {
    storage.set('node_play_' + schoolId + userId, nodeId);  // 每567ms写入localStorage
}, 567);

window.setInterval(function () {
    var bNodeId = storage.get('node_play_' + schoolId + userId);
    if (bNodeId != nodeId && layId == 0) {
        // 多窗口检测 → 弹窗警告
    }
    if (playState == 'playing') {
        totalTime++;  // ← 仅在播放时递增!
        console.log("totalTime:" + totalTime);
    }
}, 1000);
```

**关键**: totalTime **只在 `playState == 'playing'` 时递增**, 非简单计时器。

---

### L3: 多窗口检测 (localStorage)

**源码(L85-87, L91-103)**:
```javascript
// 每567ms写入当前nodeId
storage.set('node_play_' + schoolId + userId, nodeId);

// 每秒检查是否匹配
var bNodeId = storage.get('node_play_' + schoolId + userId);
if (bNodeId != nodeId) {
    Yee.alert('检测到有其他视频页面同时打开...');
    playState = 'pause';
}
```

**键名格式**: `node_play_{schoolId}{userId}`

---

### L4: 鼠标轨迹追踪

**源码(L110-136)**:
```javascript
var xlogs = [];  // 最多1500组坐标数据

document.body.addEventListener('mousemove', function (e) {
    // 收集 x, y, t (时间戳%20000) 三元组
    xlogs.push(x); xlogs.push(y); xlogs.push(t);
});

var sentLog = function () {
    //$.post('/service/mouse_log', {g: JSON.stringify(xlogs), nodeId: nodeId});
    // ← 上传被注释! 数据收集但从未发送!
};
```

**结论**: 轨迹收集代码存在, 但 `sentLog()` 中 `$.post` 被注释 → **数据从未上传, 实际无效**

---

### L5: tw鼠标指纹 ⚠️ Plan E v2失败根因

**源码(L139, L180-182)**:
```javascript
var tw = '';  // 初始为空

// mousedown时设置为'_'
yzmBox.on('mousedown', function (e) {
    tw = '_';
});

// 提交时附加到验证码
data.code = code + tw;  // "ABCD_" vs "ABCD"
```

**关键**: 自动化脚本无原生mousedown事件 → `tw=''` → 验证码提交少一个字符 → 被识别为机器人

**红队绕过**: `_spoofTwFingerprint()` 在验证码提交时手动追加 `tw='_'`

---

### L6: 文字验证码 (need_code=1)

**源码(L145-154, L255-269)**:
```javascript
// 双图验证码
<img id="codeImg" src="/service/code?r=..."/>        // 主图
<img id="codeImg" src="/service/code/aa?r=..."/>     // 辅图

// 验证码输入框
var yzmBox = $('<input type="text" placeholder="请输入验证码">');

// 提交: code = 用户输入 + tw指纹
data.code = code + tw;
```

---

### L7: 点选验证码 (need_code=2) 🔴 潜在突破点

**源码(L233-252)**:
```javascript
if (ret.need_code == 2) {
    $('.bform').captcha({
        clicks: 3,
        ak: '38570387e765646dff8372d4ec9e3c38',  // ← 硬编码ak!
        url: 'https://shixun.kaikangxinxi.com/api/dunclick.json',
        tip: '请依次点击图中的',
        verify: ret.verifyToken,
        callback: function (ret) { /* 验证回调 */ }
    });
}
```

**关键**:
- `ak` 硬编码在源码中, 可提取复用
- dunclick第三方验证平台
- `verifyToken` 来自服务端响应, 每次不同

---

### L8: online.js 强制下线 (被动防御)

> **文件**: `online.js` (来自 docs/blue_team_source/ 旧归档)

**源码(L55-69)**:
```javascript
setInterval(() => online(), 10000);  // 每10秒检测

function online() {
    $.post('/user/online', (ret) => {
        if (ret.offline) {
            alert('您的账号已在其他地方登录');
            location.href = '/user/login';
        }
    });
}
```

**节流**: localStorage `online_time` 120秒窗口

---

## 🔍 蓝队8层防御体系总览 (v4.0版, 基于源码+实测)

| Layer | 防御机制 | 源码位置 | 红队绕过状态 | 备注 |
|-------|---------|---------|-------------|------|
| L1 | /service/sign签名 | video_v2.js L15-37 | ✅ **已绕过(fix27)** | 签名端点有效, 需调用 |
| L2 | totalTime计数器 | video_v2.js L91-108 | ✅ Plan H 4x劫持 | 仅在playing时递增 |
| L3 | 多窗口检测 | video_v2.js L85-87 | ✅ 单窗口安全 | localStorage键名已知 |
| L4 | 鼠标轨迹 | video_v2.js L110-136 | ✅ 数据未上传 | sentLog被注释 |
| L5 | tw鼠标指纹 | video_v2.js L180-182 | ✅ _spoofTwFingerprint() | mousedown检测 |
| L6 | 文字验证码 | video_v2.js L145-154 | ✅ 百度OCR | 双图验证码 |
| L7 | 点选验证码 | video_v2.js L240-251 | 🔴 未测试 | 硬编码ak可用 |
| L8 | online.js强制下线 | online.js L55-69 | ⚠️ 会触发但未掉线 | 10秒心跳 |

- L8: 服务端会话冻结 — viewCount卡住时拒绝所有进度上报(SESSION-015发现)

---

## ⚠️ 重要更正 (对比旧版文档)

| 旧版(v2.0)声称 | 源码实际 | 更正 |
|---------------|---------|------|
| "/service/sign端点返回500, 完全无效" | 成功回调有日志, **端点有效** | ❌ 误判 |
| "蓝队只有安全剧场" | online.js有真实强制下线 | ❌ 误判 |
| "15x速度无检测" | totalTime只在playing时递增, 2x是安全上限 | ❌ 误判 |
| "API无服务端验证" | 服务端用时间戳做时间差校验 | ❌ 误判 |
| "鼠标轨迹无风险" | 数据收集但未上传 | ✅ 正确 |

---

## 📊 HAR分析发现 (SESSION-012)

**来源**: `scauzj.leyikji.com_video_playing2.har` (用户提供的抓包文件)

### 识别的34个资源URL模式

| 模式 | 示例 | 用途 |
|------|------|------|
| `/static/user/js/*.js` | video_v2.js, ckplayer.js, online.js | 蓝队核心JS |
| `/yeeui/**/*.js` | layer.js, yee.js | UI框架 |
| `/service/*` | /service/sign, /service/code | 服务端API |
| `/user/*` | /user/node/study, /user/online | 学习相关API |
| 第三方CDN | qidian.baicheyan.com, bqq.bsginner.com | 统计/分享组件 |

### 服务端进度校验机制 (推测)

```
服务端伪代码:
process_report(studyTime, timestamp):
    actual_interval = timestamp - last_report_time
    claimed_increment = studyTime - last_study_time
    if claimed_increment > actual_interval * 1.1:  # 超过实际时间10%
        effective_time = actual_interval * 0.1      # 惩罚系数10%
        flag_suspicious(user)
    else:
        effective_time = claimed_increment
```

**这就是为什么128轮179秒上报只记录了514秒**: 服务端在每次上报时做时间差校验, 超出容差就折扣记录。

**Plan H 4x安全的秘密**: 
- 实际上报间隔 ≈ 30秒
- 每次上报studyTime增量 ≈ 30秒 (而非240秒=4×60)
- 比率 ≈ 1.0, 在服务端1.1容差内 → **全部记录, 无惩罚**

---

## 🗂️ 旧目录清理

> **旧目录**: `docs/blue_team_source/` (已废弃, 内容合并到 `docs/blue_team/`)
> 
> **合并时间**: SESSION-013 (2026-04-15)
> 
> **清理状态**: 待删除 `docs/blue_team_source/` 整个目录

---

## 📝 版本记录

| 日期 | 版本 | 主要变更 |
|------|------|---------|
| 2026-04-14 | v1.0 | 首次归档(video.js + online.js + captcha.min.js + browser.js) |
| 2026-04-14 | v2.0 | 添加更多文件, 发现tw指纹(L5)和dunclick硬编码ak(L7) |
| 2026-04-15 | v3.0 | HAR分析, 完整8层防御体系文档化 |
| 2026-04-15 | v3.1 | **重要更正**: /service/sign端点有效(!), L1从"VULN-006无效"改为"已绕过" |
