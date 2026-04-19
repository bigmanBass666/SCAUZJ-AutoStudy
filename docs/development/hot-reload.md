# 热重载开发环境指南

## 概述

优雅大师支持热重载开发模式: 修改本地脚本文件 → 刷新页面 → 自动加载最新版本, 无需手动清除Tampermonkey缓存。

## 架构

dev.user.js (GM沙箱) → localhost:18923 → eval()

验证成功标志:
```
[DevHotReload] ✅ GM_xmlhttpRequest: 已桥接
[Init] ✅ 优雅大师就绪
```

## 快速开始

### 1. 启动开发服务器

```bash
cd scripts
python -m http.server 18923
```

### 2. 安装dev.user.js

在Tampermonkey中创建新脚本, 粘贴dev.user.js内容。确保:
- @connect localhost 已添加
- @require http://localhost:18923/elegant-master-study.user.js

### 3. 开发循环

1. 修改 `scripts/elegant-master-study.user.js`
2. 刷新目标页面
3. 脚本自动从localhost:18923加载最新版本

## 故障排除

| 问题 | 解决方案 |
|------|---------|
| 注入无反应 | 检查dev server是否运行 |
| 两个浮窗 | 禁用TM旧版脚本 |
| GM降级fetch | 桥接失败, 检查dev.user.js @connect |
| 端口冲突 | 修改_HOTRELOAD_PORT常量 |

## GM API桥接

dev.user.js通过GM_xmlhttpRequest从localhost获取脚本内容, 然后eval()执行。这确保脚本在GM沙箱中运行, 可以访问所有GM_* API。

## 生产环境部署

生产环境不需要dev server。用户直接安装elegant-master-study.user.js即可。脚本内置了热重载检测: 如果localhost:18923可达, 自动加载开发版本; 否则使用当前版本。
