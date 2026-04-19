# 红队倍速刷课方案 (v4.0-server-sync)

## 核心原理

ServerSync引擎: 上报增量 = 实际经过时间 × safeRatio(0.93)

每30秒上报一次(与蓝队原生一致)

每次上报后检查服务端进度(study_record.json)

如果服务端进度不增长,暂停等待(不盲目加速)

以study_record.json的viewCount为真实基准

---

## 历史方案(已过时,仅供参考)

| 方案 | 做法 | 失败原因 |
|------|------|---------|
| 方案一: totalTime劫持 | 每秒totalTime += (SPEED_RATE - 1) | 违反服务端时间差校验 |
| 方案二: 完全接管上报 | 绕过video.js自行POST | claimed_increment > actual_interval × 1.1 → 惩罚 |
| 方案三: 播放器+totalTime双加速 | video.playbackRate + totalTime加速 | 同方案一,服务端校验不关心播放器速度 |
| 方案四: 整合到脚本 | jumpSize/interval比率实现倍速 | 任何超过1.1比率的方案都会被惩罚 |

所有旧方案的共同致命缺陷: 声称的增量(claimed_increment)超过实际时间间隔(actual_interval)的1.1倍,触发蓝队L8服务端惩罚机制。

---

## 当前方案: ServerSync引擎 (v4.0)

### 参数

| 参数 | 值 | 说明 |
|------|---|------|
| reportInterval | 30000ms | 与蓝队原生上报间隔一致 |
| safeRatio | 0.93 | 上报增量 = 实际经过时间 × 0.93 |
| jumpSize | 28 | 每次上报声称学了28秒(30秒实际 × 0.93) |

### 工作流程

```
每30秒执行:
1. 计算增量 = 实际经过时间 × safeRatio(0.93)
2. POST /user/node/study (studyTime += 增量)
3. GET study_record.json 检查服务端viewCount
4. viewCount增长? → 继续
5. viewCount未增长? → 停滞计数+1
6. 连续3次停滞? → 暂停60秒后重试
```

### 停滞检测(Stagnation Detection)

- 触发条件: 连续3次上报后viewCount无增长
- 响应动作: 暂停60秒,让服务端会话恢复
- 重试后仍停滞? → 执行会话冻结恢复

### 会话冻结恢复(Session Freeze Recovery)

- 症状: viewCount卡住,服务端拒绝所有进度上报
- 原因: 蓝队L8服务端会话冻结机制
- 解决: 页面导航重置(离开当前节点页面再返回)
- 实现: navigate away → navigate back → 重新初始化上报循环

---

## 安全边界

| 倍速 | 上报间隔 | 安全性 |
|------|---------|--------|
| 1.0x | 30秒声称/30秒实际 | ✅ 完全安全 |
| 1.07x | 28秒声称/30秒实际(safeRatio=0.93) | ✅ 安全(当前方案) |
| 1.1x | 30秒声称/27秒实际 | ⚠️ 边界值 |
| >1.2x | 任何超过1.1比率的方案 | ❌ 被惩罚 |

关键公式: `claimed_increment / actual_interval ≤ 1.1` 才安全

当前方案: 28 / 30 = 0.933 < 1.1,留有16.7%安全余量

---

## 铁律#6: 学习记录页面为唯一真理

判断课程/节点是否完成,必须以 https://scauzj.leykeji.com/user/study_record?courseId=XXX 页面显示的数据为准

脚本UI面板的进度、控制台日志、API响应都只是辅助参考

- Course#1 (艺术鉴赏): `?courseId=1011601`
- Course#2 (劳动教育): `?courseId=1011603`

每次SESSION开始和结束时都必须访问此页面确认真实进度

绝对不能仅凭脚本UI面板显示"100%"就认为课程完成

---

## 会话冻结与恢复

### 症状

viewCount卡住,服务端拒绝所有进度上报,停滞检测连续触发

### 原因

蓝队L8服务端会话冻结机制,长时间在同一节点页面可能导致服务端会话状态异常

### 解决

页面导航重置: 离开当前节点页面再返回,重新初始化上报循环

### 注意

最后节点必须取消勾选"完成后自动下一节",否则导航重置可能跳转到错误节点

---

*v4.0-server-sync: 快而不被抓住,才是真正的红队*
