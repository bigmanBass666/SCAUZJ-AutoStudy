# 服务端学时校验机制 - 最终分析报告

## 核心结论（一句话）

**服务端使用"实际上报时间差"来验证学习时长，而非客户端上报的studyTime值。** 如果 `声称学习增量 > 实际时间差 × 阈值`，则检测为加速并降权/惩罚。**必须以服务端study_record页面记录的时长为唯一真实标准。**

---

## 一、问题复盘

### 历史问题
```
128轮 × 179秒上报 = 22,912秒 (声称总学习时间)
4倍加速实际耗时 ≈ 5,728秒 (实际运行时间)
服务端只记录 = 514秒 (8分34秒)

为什么？ → 服务端检测到了加速行为
```

### 计算验证
```
514秒 / 128轮 ≈ 4秒/轮

这意味着：服务端对每次上报只记录了约4秒的有效时长
而不是你上报的179秒/轮 × 6次 ≈ 30秒增量
```

### v4.0 ServerSync验证结果
```
Course#2 (courseId=1011603): 33/33节点 100%完成 ✅
服务端: progress=1.00, state=已学, 观看时长=42m1s
Plan H 4x劫持 + 30秒间隔上报 → 服务端接受

关键: 4x劫持totalTime + 30秒间隔 = 每次上报增量约28-32秒
实际间隔30秒 → 比值0.93-1.07 → 在服务端1.1容差内!
```

---

## 二、服务端校验机制（推测代码 - v4.0精化）

```python
class StudySession:
    def __init__(self):
        self.last_report_time = None
        self.last_study_time = 0
        self.total_effective_time = 0
        self.suspicious_count = 0

    def process_report(self, studyTime, timestamp, nodeId, studyId):
        if self.last_report_time is None:
            self.last_report_time = timestamp
            self.last_study_time = studyTime
            self.total_effective_time = studyTime
            return studyTime

        actual_interval = timestamp - self.last_report_time
        claimed_increment = studyTime - self.last_study_time

        # 核心校验: 容差系数1.1
        if claimed_increment > actual_interval * 1.1:
            effective_increment = actual_interval * 0.1
            self.suspicious_count += 1
            if self.suspicious_count > 3:
                trigger_captcha(user)
        elif claimed_increment < 0:
            effective_increment = 0
        else:
            effective_increment = claimed_increment
            self.suspicious_count = max(0, self.suspicious_count - 1)

        self.total_effective_time += effective_increment
        self.last_report_time = timestamp
        self.last_study_time = studyTime

        return self.total_effective_time
```

### 关键参数
| 参数 | 值 | 来源 |
|------|-----|------|
| 容差系数 | 1.1 | 实测: 1.0x-1.1x安全, 1.2x+被惩罚 |
| 惩罚系数 | 0.1 | 实测: 514秒/128轮≈4秒/轮 |
| CAPTCHA触发阈值 | suspicious_count > 3 | 推测 |
| 上报间隔(原生) | 10-30秒 | video_v2.js L300-310 |
| sendBeacon间隔 | 30秒 | video_v2.js L301-302 |

---

## 三、关键证据（来自video_v2.js源码完整逆向）

### 3.1 /service/sign 签名API（记录会话开始时间）
```javascript
// video_v2.js L15-37
$.ajax({
    url: '/service/sign',
    headers: {'Authorization': sign},
    type: "POST",
    data: {
        appId, nonce, timestamp,  // ← 服务端记录时间戳!
        nodeId, userId, studyId, studyTime
    },
    success: function (rest) {
        console.log("rest", rest);  // ← 回调存在! 端点有效!
    }
});
```
**⚠️ 重要更正**: 旧版误判为"返回500, 端点无效" → 实际端点有效!

### 3.2 totalTime计数器（仅在播放时递增）
```javascript
// video_v2.js L91-108
window.setInterval(function () {
    var bNodeId = storage.get('node_play_' + schoolId + userId);
    if (bNodeId != nodeId && layId == 0) {
        // 多标签检测 → 弹窗+暂停
    }
    if (playState == 'playing') {
        totalTime++;  // ← 只在playing时递增!
    }
}, 1000);
```

### 3.3 上报逻辑（10-30秒间隔）
```javascript
// video_v2.js L300-310
var interval = 10000;
if (typeof(window.navigator.sendBeacon) == 'function') {
    interval = 30000;  // ← sendBeacon支持时30秒间隔
}
window.setInterval(function () {
    if (player == null || totalTime <= studyTime) {
        return;  // ← totalTime没增长就不上报!
    }
    sendTime();
}, interval);
```

### 3.4 sendTime上报函数
```javascript
// video_v2.js L184-290
var sendTime = function (force, code) {
    studyTime = totalTime;
    var data = {nodeId: nodeId, studyId: studyId, studyTime: totalTime};
    // ... code处理, force处理 ...
    $.ajax({
        type: "POST", url: studyUrl, timeout: 3000, data: data,
        success: function (ret) {
            if (ret.status) {
                studyId = ret.studyId;  // ← 服务端返回的会话ID
            } else if (ret.need_code == 2) {
                // 点选验证码
            } else if (ret.need_code == 1) {
                // 文字验证码
            }
        }
    });
};
```

### 3.5 页面关闭时sendBeacon
```javascript
// video_v2.js L291-298
window.addEventListener('unload', function (ev) {
    var form = new FormData();
    var data = {nodeId: nodeId, studyId: studyId, studyTime: totalTime, close: 1};
    for (var k in data) { form.append(k, data[k]); }
    window.navigator.sendBeacon(studyUrl, form);
});
```

---

## 四、脚本问题深度分析

### 4.1 当前脚本的双轨冲突
```
轨道1: API直接上报 (ElegantBot.start())
  - jumpSize=30, reportInterval=2000
  - 每2秒声称学了30秒 → 15倍加速!
  - 服务端检测: 30 > 2×1.1 → 惩罚!

轨道2: totalTime劫持 (_hijackTotalTime())
  - 4x加速boost, 每1秒增加4-6
  - sendTime() hook使用劫持后的totalTime
  - 但原生sendTime间隔是30秒, 所以每次增量约120-180秒
  - 30秒间隔上报120秒增量 → 4倍加速
  - 服务端检测: 120 > 30×1.1=33 → 惩罚!
```

### 4.2 为什么Plan H有时能成功?
```
Plan H成功条件:
1. 视频实际在播放 → totalTime自然递增(1秒/秒)
2. 4x劫持叠加 → totalTime每秒增加5(1+4)
3. 原生sendTime 30秒间隔 → 增量约150秒
4. 但如果劫持被蓝队重置, totalTime回退到自然值
5. 自然值30秒增量=30秒 → 比值1.0 → 安全!

关键洞察: Plan H的成功依赖于原生sendTime使用自然totalTime
当劫持生效时, 增量过大被惩罚
当劫持失效时, 自然增量反而安全
```

### 4.3 根本问题
```
本地刷课时长 ≠ 服务端记录时长

本地声称: 基于totalTime劫持或API直接上报
服务端记录: 基于时间差校验后的有效时长

必须以服务端时长为准!
服务端真实进度 = study_record.json 中的 viewCount/duration
```

---

## 五、解决方案（v4.0 - 服务端时间同步引擎）

### 方案D: 服务端时间同步引擎（推荐 - 最新）

```javascript
class ServerSyncEngine {
    constructor(nodeId, courseId, duration) {
        this.nodeId = nodeId;
        this.courseId = courseId;
        this.duration = duration;
        this.lastReportTime = Date.now();
        this.lastServerViewCount = 0;
        this.reportInterval = 30000;  // 与蓝队原生一致
        this.safeRatio = 0.93;        // 安全系数(28秒/30秒)
    }

    async fetchServerProgress() {
        const resp = await fetch(
            `/user/study_record.json?courseId=${this.courseId}&_=${Date.now()}`,
            {headers: {'X-Requested-With': 'XMLHttpRequest'}}
        );
        const json = await resp.json();
        const node = json.list?.find(item => item.id === this.nodeId);
        return node ? {
            progress: node.progress,
            viewCount: node.viewCount,  // 服务端真实观看秒数
            state: node.state,
            duration: node.duration
        } : null;
    }

    calculateSafeIncrement() {
        const now = Date.now();
        const elapsed = (now - this.lastReportTime) / 1000;
        const safeIncrement = Math.floor(elapsed * this.safeRatio);
        return Math.max(safeIncrement, 1);
    }

    async adaptiveReport(studyId) {
        const serverProgress = await this.fetchServerProgress();
        if (serverProgress && serverProgress.progress >= 1.0) {
            return { completed: true };
        }

        const increment = this.calculateSafeIncrement();
        const newStudyTime = (serverProgress?.viewCount || 0) + increment;

        const res = await api.study(newStudyTime, studyId);
        this.lastReportTime = Date.now();

        return { completed: false, studyId: res.data?.studyId };
    }
}
```

**核心原则**:
1. **上报增量 = 实际经过时间 × 0.93** (永远不超过1.0)
2. **每30秒上报一次** (与蓝队原生一致)
3. **每次上报后检查服务端进度** (验证是否被接受)
4. **如果服务端进度不增长, 暂停等待** (不盲目加速)
5. **以study_record.json的viewCount为真实基准**

### 方案对比

| 方案 | 速度 | 安全性 | 服务端同步 | 复杂度 |
|------|------|--------|-----------|--------|
| A: 1x真实速度 | 1x | ⭐⭐⭐⭐⭐ | ✅ | 低 |
| B: 动态上报 | 1x | ⭐⭐⭐⭐⭐ | ✅ | 中 |
| C: 1.2x折中 | 1.2x | ⭐⭐⭐ | ❌ | 低 |
| **D: 服务端同步引擎** | **1.0-1.1x** | **⭐⭐⭐⭐⭐** | **✅** | **高** |

---

## 六、核心文件清单

| 文件 | 用途 | 关键内容 |
|------|------|---------|
| `video_v2.js` | **最关键** | totalTime计时、上报逻辑、签名验证、8层防御 |
| `yee.js` | UI框架 | Yee.alert弹窗系统 |
| `yee.config.js` | 框架配置 | 版本号、模块路径 |
| `captcha.min.js` | 验证码 | 点选验证码组件 |
| `layer.js` | 弹窗组件 | layer.open弹窗 |
| `browser.js` | 浏览器检测 | IE版本检测(过时) |
| `node_discuss.js` | 讨论区 | 评论表单逻辑 |
| `elegant-master-study.user.js` | 红队脚本 | API.study() 上报逻辑 |

### L8 服务端会话冻结机制(SESSION-015发现)

**现象**: viewCount卡住(如6s), 连续27+轮上报均被拒绝
**原因推测**: 服务端反作弊检测触发会话冻结
**停滞检测**: ServerSync引擎检测3次连续viewCount未增长 → 暂停60秒 → 重试
**恢复方案**: 页面导航重置(ROBUST-SESSION-RESET)
- 导航到study_record页面 → 返回当前节点 → 服务端会话状态重置
- 重置后进度上报恢复正常(viewCount开始增长)
- **关键操作**: 最后节点必须取消勾选'完成后自动下一节'再执行导航重置

---

## 七、关键接口

| 接口 | 方法 | 用途 | 频率 |
|------|------|------|------|
| `/user/node/study` | POST | **核心上报** | 10-30秒 |
| `/service/sign` | POST | 签名验证(记录时间戳) | 页面加载1次 |
| `/user/study_record.json` | GET | **获取服务端真实进度** | 每轮上报后 |
| `/user/online` | POST | 保活心跳 | 120秒 |
| `/service/code` | GET | 文字验证码图片 | 按需 |
| `/service/code/aa` | GET | 叠加验证码图片 | 按需 |

---

## 八、服务端进度验证方法

### 8.1 study_record.json 响应结构
```json
{
    "list": [{
        "id": 1429492,
        "duration": 1727,
        "progress": 0.85,
        "state": "<span>已学</span>",
        "viewCount": 1468
    }]
}
```

### 8.2 关键字段
| 字段 | 含义 | 用途 |
|------|------|------|
| `progress` | 完成进度(0-1) | 判断是否完成 |
| `viewCount` | 观看秒数 | **服务端真实记录的时长** |
| `duration` | 视频总时长 | 计算目标 |
| `state` | 学习状态 | "已学"/"未学" |

### 8.3 验证流程
```
1. 上报前: fetchServerProgress() → 获取当前viewCount
2. 上报: api.study(viewCount + safeIncrement, studyId)
3. 上报后: fetchServerProgress() → 验证viewCount是否增长
4. 如果增长: 继续下一轮
5. 如果未增长: 暂停, 等待30秒后重试
6. 如果progress=1.0: 节点完成
```

---

## 九、总结

### 服务端检测能力
- ✅ **时间戳校验**：精确检测加速行为(容差1.1)
- ✅ **签名验证**：/service/sign记录会话时间戳
- ✅ **验证码拦截**：随机触发need_code=1/2
- ✅ **进度校验**：study_record.json反映真实进度
- ⚠️ **鼠标轨迹**：sentLog被注释,当前不检测

### 破解核心
**必须让上报的时间增量 ≤ 实际上报间隔 × 1.0**

最佳策略: 上报增量 = 实际间隔 × 0.93 (28秒/30秒)

### 服务端时间为准原则
```
本地totalTime → 仅用于驱动原生sendTime
API上报studyTime → 必须基于服务端viewCount + 安全增量
服务端viewCount → 唯一真实标准
study_record页面 → 人工验证的最终依据
```

---

*报告更新时间: 2026-04-19 (v4.0更新 - ServerSync引擎 + L8会话冻结发现)*
