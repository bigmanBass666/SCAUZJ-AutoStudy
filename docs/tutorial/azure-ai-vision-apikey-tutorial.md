# Azure AI Vision（OCR / Read 接口）：如何免费领取 API Key（面向普通用户）

---

**适用对象**：有一定技术基础的开发者、研究人员、学生
**预计耗时**：约 30-60 分钟
**所需材料**：Microsoft 账号、国际信用卡（Visa/MasterCard 等）

---

## 一、这是什么服务

Azure AI Vision（原 Computer Vision）是微软 Azure 云平台提供的一项计算机视觉服务，其中包含强大的 OCR（光学字符识别）功能。Azure 提供两种 OCR 接口：
- **Read API**：专门用于文档文字提取，支持多页 PDF、手写文字、多语言混合文档
- **OCR API**：用于快速提取图片中的印刷文字

Azure 的 OCR 技术在处理复杂文档、多语言混合、手写识别方面表现出色，尤其适合需要处理扫描文档、表单、票据等场景。

**免费额度说明**：Azure AI Vision 提供非常慷慨的免费层级——**F0 定价层，每月 5,000 次免费事务**，每分钟最多 20 次调用。这个额度是 Google Cloud Vision 的 5 倍，非常适合个人项目和学习测试。

**新用户福利**：新注册 Azure 的用户可获得 **200 美元免费额度**，有效期 30 天。这个额度可用于所有 Azure 服务。

**适合谁用**：适合需要处理文档、票据、表单等复杂图片的用户。Azure 的 Read API 对多页 PDF 和手写文字识别支持特别好，适合文档数字化、票据处理等场景。

> **⚠️ 重要提示**：Azure 需要绑定国际信用卡（Visa、MasterCard 等）才能使用。中国大陆用户可能面临以下困难：
> - 需要国际信用卡
> - 可能需要稳定的网络环境访问 Azure 门户
> - 如果以上条件不满足，建议优先使用百度智能云或腾讯云 OCR 服务

---

## 二、开始之前需要准备什么

### 必须准备

1. **Microsoft 账号**：需要一个 Microsoft 账号（Outlook、Hotmail 邮箱，或自定义邮箱注册）。如果没有，可以免费注册：[https://account.microsoft.com](https://account.microsoft.com)

2. **国际信用卡**：**必须**绑定一张有效的国际信用卡（Visa、MasterCard、American Express 等）用于身份验证和付费。中国大陆发行的银联卡通常不被接受。

### 可选准备

3. **手机号**：注册 Azure 时可能需要手机验证。

### 关于费用说明

**重要**：Azure 采用「先用后付」模式。虽然 AI Vision 有每月 5,000 次的免费额度，但您仍需要：

1. 绑定有效的支付方式（信用卡）
2. 如果超出免费额度，会自动从绑定账户扣费

**好消息**：Azure 的 F0 免费层是真正的「免费」，只要您不超过 5,000 次/月，就不会产生任何费用。即使超出，标准层（S1）的价格也很低，约 $1.00/1,000 次调用。

### 关于网络访问

Azure 门户（portal.azure.com）在中国大陆通常可以正常访问。但部分功能可能需要稳定的网络环境。如果您遇到访问问题：
- 建议优先使用百度智能云或腾讯云作为替代方案
- 或者考虑使用 Azure 中国版（由世纪互联运营），但服务和定价可能与国际版有所不同

---

## 三、一步步操作：从注册到拿到 API Key

### 第一步：登录 Azure 门户

1) 打开浏览器，访问 Azure 门户：**https://portal.azure.com**

2) 使用您的 Microsoft 账号登录。如果没有 Microsoft 账号，点击「创建免费账户」进行注册。

3) 登录后，如果您是首次使用 Azure，会看到一个欢迎页面，提示您创建免费账户。

【建议在此处插入截图：Azure 门户首页】

### 第二步：创建免费账户并绑定支付方式

**这是最关键的一步**。Azure 要求绑定支付方式才能使用服务。

1) 首次登录时，会引导您完成账户设置。点击「开始使用」或「创建免费账户」。

2) 填写账户信息：
   - **国家/地区**：选择您所在的国家/地区
   - **姓名、邮箱、电话**：填写真实信息

3) 在「身份验证」步骤，需要绑定支付方式：
   - 选择支付方式类型（信用卡/借记卡）
   - 填写卡号、有效期、CVV 安全码
   - 填写持卡人姓名和账单地址

4) Azure 会进行一小笔预授权（通常是 1 美元或等值金额）来验证卡片有效性，该金额会在几天内退还。

5) 同意服务条款，点击「下一步」或「创建」。

6) 验证通过后，账户设置完成。

**新用户福利**：您会自动获得 200 美元的免费额度，有效期 30 天，可用于所有 Azure 服务。

【建议在此处插入截图：账户设置和支付方式绑定页面】

> **接下来的步骤需要绑定信用卡，请注意安全与费用说明。Azure F0 免费层是完全免费的，只要不超过 5,000 次/月，就不会产生任何费用。**

### 第三步：创建 Azure AI Vision 资源

1) 登录 Azure 门户后，在顶部搜索栏输入「Computer Vision」或「AI Vision」。

2) 在搜索结果中，点击「Computer Vision」或「Azure AI services」。

   或者直接访问：[https://portal.azure.com/#create/Microsoft.CognitiveServicesComputerVision](https://portal.azure.com/#create/Microsoft.CognitiveServicesComputerVision)

3) 点击「创建」按钮，开始创建资源。

【建议在此处插入截图：Computer Vision 资源创建入口】

### 第四步：填写资源创建信息

在创建页面，填写以下信息：

1) **基本信息」标签页：
   - **订阅**：选择您的订阅（通常只有一个）
   - **资源组**：点击「新建」，输入名称如「my-ocr-resources」
   - **区域**：选择离您最近的区域，例如：
     - 亚太地区：East Asia（香港）、Southeast Asia（新加坡）
     - 其他：Japan East、Australia East 等
   - **名称**：自定义资源名称，如「my-ocr-vision」
   - **定价层**：选择 **Free F0**（这是关键！选择免费层）

2) 点击「下一步：网络」或「下一步：身份」，保持默认设置。

3) 继续点击「下一步」直到「查看 + 提交」页面。

4) 检查所有设置，确认定价层显示为「Free F0」，点击「创建」。

5) 等待资源创建完成（通常 1-2 分钟），点击「转到资源」。

【建议在此处插入截图：资源创建页面，标注定价层选择 Free F0】

### 第五步：获取 API Key 和 Endpoint

资源创建完成后，您可以获取 API 密钥：

1) 在资源页面，左侧菜单找到「密钥和终结点」（Keys and Endpoint）。

2) 点击进入后，您会看到：
   - **KEY 1**：第一个 API 密钥
   - **KEY 2**：第二个 API 密钥（备用）
   - **终结点 (Endpoint)**：API 调用地址

3) 复制 KEY 1 和终结点地址，保存到安全的地方。

【建议在此处插入截图：密钥和终结点页面】

### 第六步：验证资源创建成功

1) 在资源页面，左侧菜单点击「概述」（Overview）。

2) 确认显示：
   - 状态：运行中
   - 定价层：Free F0
   - 本月事务数：0（刚开始使用）

3) 您也可以在这里看到 API 调用统计和配额使用情况。

---

## 四、拿到 API Key 后，下一步该怎么做

### 如何填入配置

Azure AI Vision 使用 API Key 和 Endpoint 进行认证。

**Python 示例配置：**

1) 首先，安装 Azure AI Vision 客户端库：
```bash
pip install azure-cognitiveservices-vision-computervision
```

2) 调用 API：
```python
from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from msrest.authentication import CognitiveServicesCredentials

# 配置信息
endpoint = "https://your-resource-name.cognitiveservices.azure.com/"
api_key = "您的 API Key"

# 创建客户端
client = ComputerVisionClient(
    endpoint,
    CognitiveServicesCredentials(api_key)
)

# 调用 Read API（推荐用于文档OCR）
with open('document.jpg', 'rb') as image_file:
    read_response = client.read_in_stream(image_file, raw=True)

# 获取操作ID
operation_id = read_response.headers['Operation-Location'].split('/')[-1]

# 等待识别完成并获取结果
import time
while True:
    result = client.get_read_result(operation_id)
    if result.status.lower() in ['succeeded', 'failed']:
        break
    time.sleep(1)

# 输出识别结果
if result.status.lower() == 'succeeded':
    for page in result.analyze_result.read_results:
        for line in page.lines:
            print(line.text)
```

**JSON 配置文件示例：**
```json
{
  "ocr_service": "azure",
  "endpoint": "https://your-resource-name.cognitiveservices.azure.com/",
  "api_key": "您的 API Key"
}
```

### Read API 与 OCR API 选择

Azure 提供两种 OCR 接口：

| 接口 | 特点 | 适用场景 |
|------|------|----------|
| **Read API** | 异步、支持多页PDF、手写识别、多语言混合 | 文档、票据、表单 |
| **OCR API** | 同步、快速响应、印刷体优化 | 简单图片、街景文字 |

**推荐**：对于大多数场景，建议使用 Read API，它功能更强大，识别精度更高。

### 安全保管提示

API Key 拥有访问您 Azure 资源的完整权限，请务必妥善保管：

1. **不要分享给他人**：泄露密钥可能导致他人盗用您的资源，产生费用。

2. **使用环境变量**：推荐通过环境变量存储密钥：
   ```python
   import os
   endpoint = os.environ.get("AZURE_VISION_ENDPOINT")
   api_key = os.environ.get("AZURE_VISION_KEY")
   ```

3. **定期轮换密钥**：可以在「密钥和终结点」页面点击「重新生成」来创建新密钥。

4. **有两个密钥**：KEY 1 和 KEY 2 都可以使用，建议一个用于生产，一个用于测试或备用。

### 查看免费额度和用量

1) 登录 Azure 门户：[https://portal.azure.com](https://portal.azure.com)

2) 在首页或左侧菜单，点击「成本管理 + 计费」。

3) 选择您的订阅，可以查看：
   - 本月费用
   - 免费额度使用情况
   - 各服务的使用明细

4) 在 Computer Vision 资源页面：
   - 点击「指标」（Metrics）可以查看 API 调用次数趋势
   - 点击「配额和使用情况」可以查看详细的配额信息

**设置预算提醒**：
1. 在「成本管理 + 计费」中，点击「预算」
2. 创建预算，设置月度金额上限
3. 配置提醒阈值和邮件通知

---

## 五、常见问题与注意事项

### Q1：免费额度用完后怎么收费？

**答**：Azure AI Vision 的 F0 免费层每月 5,000 次事务完全免费。超出后，需要升级到标准层（S1）：

| 定价层 | 月调用次数 | 价格 |
|--------|------------|------|
| Free F0 | 0 - 5,000 次 | 免费 |
| Standard S1 | 5,001+ 次 | 约 $1.00/1,000 次 |

**官方定价页面**：[https://azure.microsoft.com/pricing/details/computer-vision](https://azure.microsoft.com/pricing/details/computer-vision)

**重要**：F0 免费层不会自动升级到付费层。如果您超出 5,000 次，需要手动升级或购买资源包。

### Q2：新用户的 200 美元额度怎么用？

**答**：新注册 Azure 的用户可获得 200 美元额度，有效期 30 天。这个额度可用于：
- 所有 Azure 服务
- 包括升级到付费层后的费用

使用方式：无需额外操作，系统会自动使用免费额度抵扣费用。30 天后未使用的额度会失效。

### Q3：密钥泄露了怎么办？

**答**：如果 API Key 泄露，请立即采取以下措施：

1. 登录 Azure 门户
2. 进入您的 Computer Vision 资源
3. 点击左侧「密钥和终结点」
4. 点击「重新生成 KEY 1」或「重新生成 KEY 2」
5. 更新您的应用程序配置使用新密钥

### Q4：必须绑定信用卡吗？

**答**：是的。即使您只使用 F0 免费层，Azure 也要求绑定有效的支付方式。这是用于：
- 身份验证（防止滥用）
- 超出免费额度时（如果升级到付费层）自动扣费

如果您没有国际信用卡，建议使用百度智能云、腾讯云或 OCR.space 等不需要绑定信用卡的服务。

### Q5：F0 免费层有限制吗？

**答**：F0 免费层有以下限制：

| 限制项 | 限制值 |
|--------|--------|
| 每月事务数 | 5,000 次 |
| 每分钟事务数 | 20 次 |
| 图片大小 | 最大 4MB |
| 图片尺寸 | 最小 50×50，最大 10000×10000 |

如果需要更高的调用频率，需要升级到标准层。

### Q6：在中国大陆能用吗？

**答**：Azure 国际版在中国大陆访问情况：

| 问题 | 解决方案 |
|------|----------|
| 门户访问 | 通常可以正常访问 |
| API 调用 | 连接到海外服务器，可能有延迟 |
| 无国际信用卡 | 建议使用百度智能云、腾讯云替代 |

**Azure 中国版**：微软在中国提供由世纪互联运营的 Azure 中国版，但服务、定价和免费政策可能与国际版有所不同。

**强烈建议**：如果您在中国大陆且没有国际信用卡，请优先使用百度智能云或腾讯云的 OCR 服务。

### Q7：Read API 和 OCR API 哪个更好？

**答**：两者各有优势：

**Read API（推荐）**：
- ✅ 支持多页 PDF 文档
- ✅ 支持手写文字识别
- ✅ 支持多语言混合文档
- ✅ 提供更丰富的结构化信息（段落、行、词）
- ❌ 异步调用，需要轮询结果

**OCR API**：
- ✅ 同步调用，响应更快
- ✅ 适合简单的图片文字提取
- ❌ 不支持 PDF
- ❌ 对手写识别效果一般

**建议**：对于文档处理场景，优先使用 Read API；对于快速提取简单图片文字，可以使用 OCR API。

### 重要注意事项

> **⚠️ 给中国大陆用户的建议**：
>
> Azure 国际版需要：
> 1. 国际信用卡（Visa/MasterCard 等）
> 2. 稳定的网络环境（虽然门户通常可访问，但 API 可能需要连接海外服务器）
>
> 如果以上条件不满足，强烈建议优先使用：
> - **百度智能云 OCR**：每月 1,000 次免费额度，无需信用卡
> - **腾讯云 OCR**：每月 1,000 次免费额度，无需信用卡
> - **OCR.space**：每月 25,000 次免费额度，只需邮箱

1. **必须绑定支付方式**：即使只使用 F0 免费层，也需要绑定信用卡。

2. **选择 Free F0 定价层**：创建资源时务必选择 Free F0，否则会产生费用。

3. **F0 层不会自动扣费**：免费层的 5,000 次调用完全免费，不会自动扣费。超出后 API 会返回错误，而不是自动计费。

4. **新用户额度有效期**：200 美元新用户额度有效期仅 30 天，请合理规划使用。

5. **两个密钥可轮换**：KEY 1 和 KEY 2 都可以使用，方便密钥轮换。

6. **配额限制**：F0 层每分钟最多 20 次调用，如果短时间内大量请求可能会被限流。

---

**官方文档入口**：
- Azure AI Vision 首页：[https://azure.microsoft.com/products/cognitive-services/computer-vision](https://azure.microsoft.com/products/cognitive-services/computer-vision)
- 定价页面：[https://azure.microsoft.com/pricing/details/computer-vision](https://azure.microsoft.com/pricing/details/computer-vision)
- Read API 文档：[https://learn.microsoft.com/azure/ai-services/computer-vision/how-to/call-read-api](https://learn.microsoft.com/azure/ai-services/computer-vision/how-to/call-read-api)
- 快速入门：[https://learn.microsoft.com/azure/ai-services/computer-vision/quickstarts-sdk/client-library](https://learn.microsoft.com/azure/ai-services/computer-vision/quickstarts-sdk/client-library)
- 免费服务列表：[https://azure.microsoft.com/free](https://azure.microsoft.com/free)
