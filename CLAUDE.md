- 第一件事: 阅读 ./声明.md
- 每一个任务完成后进行git提交

账号: REDACTED_USERNAME
密码: REDACTED_PASSWORD

视频页面示例: https://scauzj.leykeji.com/user/node?nodeId=1429487

---

## 🔁 求助协议：遇到困难时问 z.ai

当你遇到以下情况时，主动使用此协议：
- 代码逻辑搞不懂，反复修改仍失败
- 需要更深层的技术判断
- 不确定架构方案

### 执行步骤（严格按顺序）

**第一步：构造问题**
把问题描述压缩到最精简，必须包含：
- 你在做什么
- 当前卡在哪
- 相关的代码片段或错误信息
- 你已经尝试过什么

**第二步：导航到 z.ai**
```
browser_navigate → https://z.ai
等待页面加载完成（browser_snapshot 确认输入框出现）
```

**第三步：输入问题**
```
browser_type → ref=e77, text: 你的问题文本
```
注意：问题文本中不要有反引号包裹，直接写纯文本。

**第四步：发送消息**
```
browser_click → ref=e100
```
或者用 JS（更健壮）：
```
browser_execute →
  const sendBtn = document.querySelector('button[ref]') || document.querySelector('button[type="submit"]');
  sendBtn?.click();
```

**第五步：等待回复完成**
```
循环执行（每3秒一次，最多等120秒）：
  browser_execute →
    const stopBtn = document.querySelector('button[aria-label*="Stop"], button[aria-label*="停止"]');
    const isGenerating = stopBtn !== null;
    return !isGenerating;  // 返回 true 表示已完成
当返回 true 时，再额外等 2 秒确保渲染完毕
```

**第六步：提取回复**
```
browser_execute →
  const msgs = document.querySelectorAll('[data-message-author-role="assistant"], [class*="assistant-message"], .prose');
  const last = msgs[msgs.length - 1];
  return last ? last.innerText : '未找到回复';
```

**第七步：使用回复**
- 提取到的文本就是 z.ai 的回答
- 基于这个回答继续你的工作
- 不要把整个回答复述给用户，只说"我参考了更详细的分析后，决定……"

### 注意事项
- 如果提取失败，用 browser_snapshot 获取页面内容手动找
- 如果 z.ai 界面改版导致选择器失效，用 browser_snapshot 观察当前 DOM 结构，自适应调整
- 不要频繁求助，同一类问题最多问一次
- 提问时不要暴露你在用自动化工具，就用正常语气提问
