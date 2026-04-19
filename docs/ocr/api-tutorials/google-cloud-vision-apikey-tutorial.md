# Google Cloud Vision API（OCR 文字识别）：如何免费领取 API Key（面向普通用户）

---

**适用对象**：有一定技术基础的开发者、研究人员、学生
**预计耗时**：约 30-60 分钟
**所需材料**：Google 账号、国际信用卡（Visa/MasterCard 等）

---

## 一、这是什么服务

Google Cloud Vision API 是谷歌云平台提供的一项强大的图像分析服务，其中包含 OCR（光学字符识别）功能。它能够识别图片中的文字内容，支持全球多种语言，包括中文、英文、日文、韩文等。除了文字识别，该服务还支持图像标签检测、人脸检测、地标识别、安全搜索等多种功能。

**免费额度说明**：Google Cloud Vision API 提供**每月 1,000 个免费单元（units）**。这里的「单元」是计费单位，不同的功能消耗不同的单元数：
- 文字检测（TEXT_DETECTION）：每张图片消耗 1 个单元
- 文档文字检测（DOCUMENT_TEXT_DETECTION）：每张图片消耗 1 个单元

因此，对于 OCR 使用场景，您每月可以免费处理约 **1,000 张图片**。

**新用户福利**：新注册 Google Cloud 的用户可获得 **300 美元免费额度**，有效期为 90 天。这个额度可以用于所有 Google Cloud 服务，包括 Vision API。

**适合谁用**：适合需要高质量 OCR 服务、多语言支持、以及需要与其他 Google Cloud 服务配合使用的开发者。Google 的 OCR 技术在多语言识别、手写识别方面表现出色。

> **⚠️ 重要提示**：Google Cloud 需要绑定国际信用卡（Visa、MasterCard 等）才能使用。中国大陆用户可能面临以下困难：
> - 需要国际信用卡
> - 可能需要稳定的网络环境访问 Google Cloud 控制台
> - 如果以上条件不满足，建议优先使用百度智能云或腾讯云 OCR 服务

---

## 二、开始之前需要准备什么

### 必须准备

1. **Google 账号**：需要一个 Google 账号（Gmail 邮箱）。如果没有，可以免费注册：[https://accounts.google.com](https://accounts.google.com)

2. **国际信用卡**：**必须**绑定一张有效的国际信用卡（Visa、MasterCard、American Express 等）用于身份验证和付费。中国大陆发行的银联卡通常不被接受。

### 可选准备

3. **手机号**：注册 Google Cloud 时可能需要手机验证。

### 关于费用说明

**重要**：Google Cloud 采用「先用后付」模式。虽然 Vision API 有每月 1,000 单元的免费额度，但您仍需要：

1. 绑定有效的支付方式（信用卡）
2. 如果超出免费额度，会自动从绑定账户扣费

**好消息**：Google 提供预算和提醒功能，您可以设置预算上限，防止意外超支。

### 关于网络访问

Google Cloud 控制台（console.cloud.google.com）在中国大陆可能需要稳定的网络环境才能访问。如果您无法访问：
- 建议优先使用百度智能云或腾讯云作为替代方案
- 这两个国内服务同样提供免费额度，且网络访问更稳定

---

## 三、一步步操作：从注册到拿到 API Key

### 第一步：登录 Google Cloud 控制台

1) 打开浏览器，访问 Google Cloud 控制台：**https://console.cloud.google.com**

2) 使用您的 Google 账号登录。如果没有 Google 账号，点击「创建账号」进行注册。

3) 登录后，如果您是首次使用 Google Cloud，会看到一个欢迎页面。

【建议在此处插入截图：Google Cloud 控制台首页】

### 第二步：创建 Google Cloud 项目

Google Cloud 的所有服务都需要在「项目」下使用。首次使用需要创建项目。

1) 登录后，点击页面顶部的项目选择器（显示为当前项目名称或「Select a project」）。

2) 在弹出的对话框中，点击「新建项目」。

3) 填写项目信息：
   - **项目名称**：自定义名称，例如「my-ocr-project」
   - **组织/位置**：保持默认即可

4) 点击「创建」按钮。

5) 等待项目创建完成（通常几秒钟），然后选择刚创建的项目。

【建议在此处插入截图：新建项目对话框】

### 第三步：设置结算账户（绑定信用卡）

**这是最关键的一步**。Google Cloud 要求绑定支付方式才能使用服务。

1) 在左侧导航菜单中，点击「结算」(Billing)。

   或直接访问：[https://console.cloud.google.com/billing](https://console.cloud.google.com/billing)

2) 点击「关联结算账号」或「创建结算账号」。

3) 按照页面提示，填写以下信息：
   - **国家/地区**：选择您所在的国家/地区
   - **账号类型**：个人（Individual）或企业（Business）
   - **联系信息**：姓名、地址等

4) 在支付方式页面，填写信用卡信息：
   - 卡号
   - 有效期
   - CVV 安全码
   - 持卡人姓名

5) Google 会进行一小笔预授权（通常是 1 美元或等值金额）来验证卡片有效性，该金额会在几天内退还。

6) 验证通过后，结算账户设置完成。

**新用户福利**：如果您是新用户，会自动获得 300 美元的免费额度，有效期 90 天。

【建议在此处插入截图：结算账户设置页面】

> **接下来的步骤需要绑定信用卡，请注意安全与费用说明。Google 不会在您未主动购买服务的情况下扣费，但请务必设置预算提醒以防意外超支。**

### 第四步：启用 Cloud Vision API

1) 在左侧导航菜单中，点击「API 和服务」→「库」。

   或直接访问：[https://console.cloud.google.com/apis/library](https://console.cloud.google.com/apis/library)

2) 在搜索框中输入「Cloud Vision API」。

3) 点击搜索结果中的「Cloud Vision API」。

4) 在 API 详情页面，点击「启用」按钮。

5) 等待 API 启用完成（通常几秒钟）。

【建议在此处插入截图：Cloud Vision API 启用页面】

### 第五步：创建服务账号和密钥

Google Cloud 使用「服务账号」进行 API 认证。以下是创建步骤：

1) 在左侧导航菜单中，点击「IAM 和管理」→「服务账号」。

   或直接访问：[https://console.cloud.google.com/iam-admin/serviceaccounts](https://console.cloud.google.com/iam-admin/serviceaccounts)

2) 确保页面顶部的项目选择器中已选中您的项目。

3) 点击页面顶部的「创建服务账号」。

4) 填写服务账号信息：
   - **服务账号名称**：例如「ocr-service-account」
   - **服务账号 ID**：自动生成，无需修改
   - **描述**：可选，例如「用于 OCR 服务的服务账号」

5) 点击「创建并继续」。

6) 在「授予此服务账号访问项目的权限」步骤：
   - 角色选择：搜索「Vision」，选择「Cloud Vision 使用者」(Cloud Vision Service Usage Consumer)
   - 或者选择「Owner」(所有者) 获得完整权限（测试阶段可以选这个）

7) 点击「继续」。

8) 在「授予用户访问此服务账号的权限」步骤，可以跳过，直接点击「完成」。

【建议在此处插入截图：创建服务账号页面】

### 第六步：创建 API 密钥（JSON 格式）

1) 在服务账号列表中，找到刚创建的服务账号，点击其邮箱地址进入详情页。

2) 切换到「密钥」标签页。

3) 点击「添加密钥」→「创建新密钥」。

4) 密钥类型选择「JSON」。

5) 点击「创建」。

6) 浏览器会自动下载一个 JSON 格式的密钥文件。**请妥善保存此文件**，它包含您的服务账号私钥，用于 API 认证。

7) 该文件内容类似于：
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "ocr-service-account@your-project.iam.gserviceaccount.com",
  ...
}
```

【建议在此处插入截图：创建密钥页面】

---

## 四、拿到 API Key 后，下一步该怎么做

### 如何填入配置

Google Cloud Vision API 使用 JSON 密钥文件进行认证，而不是简单的 API Key 字符串。

**Python 示例配置：**

1) 首先，安装 Google Cloud Vision 客户端库：
```bash
pip install google-cloud-vision
```

2) 设置环境变量指向密钥文件：
```python
import os
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = '/path/to/your-key.json'
```

3) 调用 API：
```python
from google.cloud import vision

# 创建客户端
client = vision.ImageAnnotatorClient()

# 读取图片
with open('image.jpg', 'rb') as image_file:
    content = image_file.read()

image = vision.Image(content=content)

# 文字检测
response = client.text_detection(image=image)
texts = response.text_annotations

for text in texts:
    print(text.description)
```

**JSON 配置文件示例：**
```json
{
  "ocr_service": "google",
  "credentials_path": "/path/to/your-service-account-key.json"
}
```

### 安全保管提示

JSON 密钥文件包含完整的私钥信息，泄露风险极高：

1. **绝对不要分享给他人**：任何人获得此文件都可以访问您的 Google Cloud 资源。

2. **不要上传到公开仓库**：将密钥文件添加到 `.gitignore`，防止意外提交到 GitHub。

3. **使用环境变量**：推荐通过环境变量传递密钥文件路径，而不是硬编码。

4. **定期轮换密钥**：可以在控制台删除旧密钥，创建新密钥。

5. **限制权限**：只授予服务账号必要权限（如 Cloud Vision 使用者），避免授予 Owner 权限。

### 查看免费额度和用量

1) 登录 Google Cloud 控制台：[https://console.cloud.google.com](https://console.cloud.google.com)

2) 在左侧导航菜单中，点击「API 和服务」→「仪表板」。

3) 选择您的项目，可以看到各 API 的使用情况。

4) 点击「Cloud Vision API」查看详细用量。

5) 要查看费用和额度：
   - 点击左侧菜单「结算」
   - 选择结算账号
   - 可以查看当前账单、免费额度使用情况等

**设置预算提醒**：
1. 在「结算」页面，点击「预算和提醒」
2. 创建预算，设置月度预算金额
3. 配置提醒阈值（如达到 50%、90% 时发送邮件提醒）

---

## 五、常见问题与注意事项

### Q1：免费额度用完后怎么收费？

**答**：Vision API 采用阶梯定价，每月前 1,000 单元免费。超出后的价格如下：

| 功能 | 每月用量 | 价格（每 1,000 单元） |
|------|----------|------------------------|
| 文字检测 (TEXT_DETECTION) | 1 - 5,000,000 单元 | $1.50 |
| 文字检测 | 5,000,001+ 单元 | $0.60 |

**官方定价页面**：[https://cloud.google.com/vision/pricing](https://cloud.google.com/vision/pricing)

**重要**：只要您的用量不超过每月 1,000 单元，就不会产生任何费用。

### Q2：新用户的 300 美元额度怎么用？

**答**：新注册 Google Cloud 的用户可获得 300 美元额度，有效期 90 天。这个额度可用于：
- 所有 Google Cloud 服务
- 包括超出免费额度的部分

使用方式：无需额外操作，系统会自动使用免费额度抵扣费用。90 天后未使用的额度会失效。

### Q3：密钥泄露了怎么办？

**答**：如果 JSON 密钥文件泄露，请立即采取以下措施：

1. 登录 Google Cloud 控制台
2. 进入「IAM 和管理」→「服务账号」
3. 找到对应的服务账号
4. 进入「密钥」标签页
5. 点击泄露密钥旁边的「删除」按钮
6. 创建新密钥，并更新您的应用程序配置

### Q4：必须绑定信用卡吗？

**答**：是的。即使您只使用免费额度，Google Cloud 也要求绑定有效的支付方式。这是用于：
- 身份验证（防止滥用）
- 超出免费额度时自动扣费

如果您没有国际信用卡，建议使用百度智能云、腾讯云或 OCR.space 等不需要绑定信用卡的服务。

### Q5：TEXT_DETECTION 和 DOCUMENT_TEXT_DETECTION 有什么区别？

**答**：
- **TEXT_DETECTION（文字检测）**：适用于普通场景，检测图片中的文字并返回文字内容。适合简单的文字提取场景。
- **DOCUMENT_TEXT_DETECTION（文档文字检测）**：针对文档图片优化，能更好地处理密集文字、多段落排版。返回的结构化信息更丰富，包含文字位置、段落信息等。

两者都消耗 1 个单元/张，建议根据图片类型选择合适的功能。

### Q6：在中国大陆能用吗？

**答**：Google Cloud 服务在中国大陆可能存在访问限制：

| 问题 | 解决方案 |
|------|----------|
| 控制台无法访问 | 需要稳定的网络环境 |
| API 调用超时 | 可能需要代理或海外服务器 |
| 无国际信用卡 | 建议使用百度智能云、腾讯云替代 |

**强烈建议**：如果您在中国大陆且没有稳定的网络环境和国际信用卡，请优先使用百度智能云或腾讯云的 OCR 服务。

### Q7：如何设置预算防止意外超支？

**答**：设置预算提醒的步骤：

1. 进入「结算」→「预算和提醒」
2. 点击「创建预算」
3. 设置预算名称和金额（如 10 美元）
4. 配置提醒阈值：50%、90%、100% 时发送邮件
5. 可选择在达到 100% 时关闭服务

这样可以有效防止意外产生高额费用。

### 重要注意事项

> **⚠️ 给中国大陆用户的建议**：
>
> Google Cloud 服务需要：
> 1. 稳定的网络环境访问控制台
> 2. 国际信用卡（Visa/MasterCard 等）
>
> 如果以上条件不满足，强烈建议优先使用：
> - **百度智能云 OCR**：每月 1,000 次免费额度，无需信用卡
> - **腾讯云 OCR**：每月 1,000 次免费额度，无需信用卡
> - **OCR.space**：每月 25,000 次免费额度，只需邮箱

1. **必须绑定支付方式**：即使只使用免费额度，也需要绑定信用卡。

2. **密钥文件泄露风险极高**：JSON 密钥文件包含完整私钥，泄露后他人可完全控制您的云资源，请务必妥善保管。

3. **设置预算提醒**：建议设置预算和提醒，防止意外超支。

4. **90 天试用期**：新用户 300 美元额度有效期仅 90 天，逾期作废。

5. **免费额度每月刷新**：Vision API 的 1,000 单元免费额度每月自动刷新。

---

**官方文档入口**：
- Cloud Vision API 首页：[https://cloud.google.com/vision](https://cloud.google.com/vision)
- 定价页面：[https://cloud.google.com/vision/pricing](https://cloud.google.com/vision/pricing)
- 快速入门：[https://cloud.google.com/vision/docs/setup](https://cloud.google.com/vision/docs/setup)
- API 文档：[https://cloud.google.com/vision/docs](https://cloud.google.com/vision/docs)
- 免费层级说明：[https://cloud.google.com/free](https://cloud.google.com/free)
