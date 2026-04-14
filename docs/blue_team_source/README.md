# 蓝队前端源码归档

> **获取时间**: 2026-04-14
> **获取方式**: `curl.exe` 直接下载
> **用途**: 红队安全测试证据保全，漏洞分析参考

## 文件清单

| 文件名 | 大小 | 说明 |
|--------|------|------|
| `video.js_v1776144682.js` | 14.2 KB | 蓝队主反作弊脚本，包含7层检测机制 |
| `online.js_v1.0.1.js` | 2.6 KB | 强制下线检测，每10秒上报在线状态 |
| `captcha.min.js_v3.0.0.1.js` | 24.0 KB | 验证码组件（jsjiami.com.v6混淆+RC4加密） |
| `browser.js` | 391 B | 浏览器兼容性检测（仅IE6-9） |

## 快速参考

### video.js 关键机制（详见 docs/red_team/vulnerability-report.md FIND-004）

| Layer | 机制 | 源码位置 |
|-------|------|----------|
| L1 | /service/sign 签名 | `$.ajax({url:'/service/sign', ...})` |
| L2 | totalTime计数器 | `window.setInterval(..., 1000)` → `totalTime++` |
| L3 | 多窗口检测 | `storage.set('node_play_' + schoolId + userId, nodeId)` |
| L4 | 鼠标轨迹 | `document.body.addEventListener('mousemove', ...)` (已注释上传) |
| L5 | tw指纹 | `yzmBox.on('mousedown', () => tw='_')` |
| L6 | 文字验证码 | `need_code=1` → `/service/code` |
| L7 | 点选验证码 | `need_code=2` → dunclick API, ak='38570387e765646dff8372d4ec9e3c38' |

### online.js 关键逻辑

```javascript
// 每10秒检测强制下线
setInterval(() => online(), 10000);
$.post('/user/online', (ret) => {
    if (ret.offline) location.href = '/user/login';
});
```

### captcha.min.js 混淆说明

- 混淆器: jsjiami.com.v6
- 加密: RC4 (key在代码中动态解密)
- 如需完全还原，需使用去混淆工具

## 版本记录

| 日期 | 版本 | 备注 |
|------|------|------|
| 2026-04-14 | v1776144682 | 首次归档，发现tw指纹(L5)、dunclick硬编码ak(L7) |
