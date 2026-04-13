# 油猴脚本 OCR API 集成技术文档（5 家服务合集）

> **目标读者**：负责编写油猴脚本的 AI 助手或开发者。本文档提供可直接用于编写代码的技术细节。
> **最后更新**：2026 年 4 月

---

## 目录

1. [百度智能云 OCR](#1-百度智能云-ocr-api-集成技术文档油猴脚本专用)
2. [腾讯云 OCR](#2-腾讯云-ocr-api-集成技术文档油猴脚本专用)
3. [OCR.space](#3-ocrspace-api-集成技术文档油猴脚本专用)
4. [Google Cloud Vision API](#4-google-cloud-vision-api-集成技术文档油猴脚本专用)
5. [Azure AI Vision](#5-azure-ai-vision-api-集成技术文档油猴脚本专用)
6. [总结对比与推荐](#6-总结对比与推荐)

---

# 1. 百度智能云 OCR API 集成技术文档（油猴脚本专用）

## 1.1 API 接口概览

| 版本 | 接口 URL | 核心功能 |
|------|----------|----------|
| 标准版（不含位置） | `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic` | 通用文字识别 |
| 标准版（含位置） | `https://aip.baidubce.com/rest/2.0/ocr/v1/general` | 通用文字识别（返回坐标） |
| 高精度版（不含位置） | `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic` | 高精度通用文字识别 |
| 高精度版（含位置） | `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate` | 高精度通用文字识别（返回坐标） |

- **请求方法**：`POST`
- **Content-Type**：`application/x-www-form-urlencoded`
- **核心功能**：通用文字识别（标准版），识别图片中的中英文文字，适合大多数场景。

> 官方文档：https://ai.baidu.com/ai-doc/OCR/zk3h7xz52

---

## 1.2 鉴权机制详解

### 鉴权方式：OAuth 2.0（双 Key → Access Token）

百度 OCR 采用 **双 Key 机制**（API Key + Secret Key），通过 OAuth 2.0 获取 `access_token`，后续请求使用该 Token 进行鉴权。

### 获取凭证步骤

**步骤 1：获取 API Key 和 Secret Key**

登录百度智能云控制台 https://console.bce.baidu.com/ → 创建应用 → 获取 API Key 和 Secret Key。

**步骤 2：请求 Access Token**

```
POST https://aip.baidubce.com/oauth/2.0/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id={API_KEY}&client_secret={SECRET_KEY}
```

**步骤 3：Token 响应**

```json
{
  "refresh_token": "25.b55fe1d287227ca97aab219bb249b8ab.315360000.1798284651.282335-8574074",
  "expires_in": 2592000,
  "session_key": "9mzdDZXu3dENdF1QZRntm...",
  "access_token": "24.f5ba7b67b58be4c1c2d32fa1c6e8e7f7.2592000.1715716651.282335-8574074",
  "scope": "public brain_all_scope ocr_business_license"
}
```

- **access_token 有效期：30 天**（2592000 秒）
- 后续 OCR 请求通过 URL Query 参数传递 `access_token`

### 前端实现评估

| 维度 | 评估 |
|------|------|
| 算法复杂度 | 低（仅需一次 HTTP POST 获取 Token） |
| 前端实现难度 | ⭐ 简单 |
| 安全性风险 | 中（API Key + Secret Key 暴露在前端代码中） |
| Token 管理 | 建议缓存 Token，避免每次 OCR 请求都重新获取 |

### 请求头示例

OCR 请求本身不需要特殊 Header（Token 通过 URL 参数传递），Token 获取请求的 Header 如下：

```
POST https://aip.baidubce.com/oauth/2.0/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id={API_KEY}&client_secret={SECRET_KEY}
```

---

## 1.3 请求构造（Payload）

### Content-Type

```
application/x-www-form-urlencoded
```

### 图片参数

| 参数名 | 格式 | 说明 |
|--------|------|------|
| `image` | **纯 Base64 字符串**（不含 `data:image/...;base64,` 前缀） | Base64 编码后不超过 4MB |
| `url` | 图片完整 URL（公网可访问） | URL 长度不超过 1024 字节 |

`image` 和 `url` 二选一，推荐使用 `image`（Base64）方式。

### 其他关键参数

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `language_type` | string | `CHN_ENG` | 识别语言：`CHN_ENG`（中英混合）、`ENG`、`JAP`、`KOR`、`FRE`、`GER`、`SPA`、`POR` 等 |
| `detect_direction` | boolean | `false` | 是否检测图像朝向 |
| `paragraph` | boolean | `false` | 是否输出段落信息 |
| `probability` | boolean | `false` | 是否返回置信度 |

### 请求示例

```
POST https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token={YOUR_TOKEN}
Content-Type: application/x-www-form-urlencoded

image=/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsL...
&language_type=CHN_ENG
```

---

## 1.4 响应解析（Response Parsing）

### 成功响应示例

```json
{
  "words_result_num": 3,
  "words_result": [
    { "words": "百度OCR文字识别" },
    { "words": "通用文字识别API" },
    { "words": "准确率高，速度快" }
  ],
  "log_id": 1493937233472857397
}
```

### 提取路径

```
response.words_result[i].words    → 每一行识别的文字
response.words_result_num          → 行数
```

**拼接所有文字**：

```javascript
const allText = response.words_result.map(item => item.words).join('\n');
```

### 常见错误码

| 错误码 | 错误信息 | 说明 |
|--------|----------|------|
| 1101 | Access token invalid or no longer valid | access_token 无效或已过期 |
| 1102 | Access token expired | access_token 已过期 |
| 1112 | The format of API Key is incorrect | API Key 格式错误 |
| 216201 | image format error | 图片格式不支持（仅支持 jpg/png/bmp） |
| 216202 | image size error | 图片大小超过 4MB 限制 |
| 222202 | unrecognized image | 图片中未检测到文字 |
| 18 | QPS limit reached | 请求过于频繁 |

---

## 1.5 油猴/Tampermonkey 环境适配指南

### CORS（跨域）处理

> **⚠️ 百度 OCR API 不支持浏览器端直接跨域调用。** 百度 API 服务端未设置 `Access-Control-Allow-Origin` 响应头，浏览器端直接使用 `fetch` 或 `XMLHttpRequest` 会遇到 CORS 跨域拦截。

**解决方案**：在油猴脚本中使用 `GM_xmlhttpRequest` 替代标准 `fetch`。`GM_xmlhttpRequest` 不受浏览器同源策略限制，可以直接发送跨域请求。

### 代码实现策略

1. **Token 缓存机制**：建议在脚本启动时先请求一次 Token 并缓存（使用 `GM_setValue` / `GM_getValue`），后续 OCR 请求复用。Token 有效期 30 天，无需频繁刷新。
2. **鉴权流程**：
   - 首次运行：用 API Key + Secret Key 获取 access_token → 存入 `GM_setValue`
   - 后续请求：从 `GM_getValue` 读取 access_token → 检查是否过期 → 如果过期则重新获取
3. **安全性提醒**：API Key 和 Secret Key 将明文存储在油猴脚本中，存在泄露风险。建议用户自行申请密钥，不要在公开脚本中硬编码。

---

## 1.6 代码示例（JavaScript / GM_xmlhttpRequest）

```javascript
// ==UserScript==
// @name         Baidu OCR Integration
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  百度智能云 OCR 集成
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      aip.baidubce.com
// ==/UserScript==

(function () {
  'use strict';

  const BAIDU_TOKEN_URL = 'https://aip.baidubce.com/oauth/2.0/token';
  const BAIDU_OCR_URL = 'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic';
  const TOKEN_CACHE_KEY = 'baidu_ocr_access_token';
  const TOKEN_EXPIRE_KEY = 'baidu_ocr_token_expire';

  /**
   * 获取 Access Token（带缓存）
   */
  function getAccessToken(apiKeyConfig) {
    return new Promise((resolve, reject) => {
      // 检查缓存的 Token 是否有效
      const cachedToken = GM_getValue(TOKEN_CACHE_KEY, '');
      const expireTime = GM_getValue(TOKEN_EXPIRE_KEY, 0);

      if (cachedToken && Date.now() < expireTime) {
        resolve(cachedToken);
        return;
      }

      // 请求新 Token
      GM_xmlhttpRequest({
        method: 'POST',
        url: `${BAIDU_TOKEN_URL}?grant_type=client_credentials&client_id=${apiKeyConfig.apiKey}&client_secret=${apiKeyConfig.secretKey}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        onload: function (response) {
          try {
            const data = JSON.parse(response.responseText);
            if (data.access_token) {
              // 缓存 Token，提前 1 天过期
              GM_setValue(TOKEN_CACHE_KEY, data.access_token);
              GM_setValue(TOKEN_EXPIRE_KEY, Date.now() + (data.expires_in - 86400) * 1000);
              resolve(data.access_token);
            } else {
              reject(new Error(`获取 Token 失败: ${data.error_description || JSON.stringify(data)}`));
            }
          } catch (e) {
            reject(new Error('Token 响应解析失败: ' + e.message));
          }
        },
        onerror: function (error) {
          reject(new Error('Token 请求网络错误'));
        },
        ontimeout: function () {
          reject(new Error('Token 请求超时'));
        }
      });
    });
  }

  /**
   * 百度 OCR 识别
   * @param {string} imageBase64 - 不含前缀的纯 Base64 字符串
   * @param {object} apiKeyConfig - { apiKey: string, secretKey: string }
   * @returns {Promise<string>} 识别出的纯文本
   */
  function recognizeWithBaidu(imageBase64, apiKeyConfig) {
    return new Promise(async (resolve, reject) => {
      try {
        const accessToken = await getAccessToken(apiKeyConfig);

        GM_xmlhttpRequest({
          method: 'POST',
          url: `${BAIDU_OCR_URL}?access_token=${accessToken}`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: `image=${encodeURIComponent(imageBase64)}&language_type=CHN_ENG`,
          onload: function (response) {
            try {
              const data = JSON.parse(response.responseText);
              if (data.error_code) {
                reject(new Error(`百度 OCR 错误 [${data.error_code}]: ${data.error_msg}`));
                return;
              }
              if (data.words_result && data.words_result.length > 0) {
                const text = data.words_result.map(item => item.words).join('\n');
                resolve(text);
              } else {
                reject(new Error('未识别到文字'));
              }
            } catch (e) {
              reject(new Error('响应解析失败: ' + e.message));
            }
          },
          onerror: function () {
            reject(new Error('OCR 请求网络错误'));
          },
          ontimeout: function () {
            reject(new Error('OCR 请求超时'));
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // 暴露到全局
  window.recognizeWithBaidu = recognizeWithBaidu;
})();
```

---

# 2. 腾讯云 OCR API 集成技术文档（油猴脚本专用）

## 2.1 API 接口概览

| 项目 | 值 |
|------|------|
| 接口名称 | `GeneralBasicOCR`（通用印刷体识别） |
| 请求域名 | `https://ocr.tencentcloudapi.com` |
| HTTP 方法 | `POST` |
| Content-Type | `application/json; charset=utf-8` |
| API 版本 | `2018-11-19` |
| 核心功能 | 识别图片中的中英文文字，支持多语言 |

> 官方文档：https://cloud.tencent.com/document/product/866/33526

---

## 2.2 鉴权机制详解

### 鉴权方式：TC3-HMAC-SHA256 签名

腾讯云 API 3.0 使用 **TC3-HMAC-SHA256** 签名算法。这是一种基于 HMAC-SHA256 的请求签名机制，涉及多层密钥派生和字符串拼接。

### 安全凭证

- **SecretId**：用于标识 API 调用者身份（类似用户名）
- **SecretKey**：用于验证 API 调用者身份（类似密码）
- 获取方式：腾讯云控制台 → 云 API 密钥管理 → 新建密钥

### 签名计算步骤（4 步）

**步骤 1：拼接规范请求串（CanonicalRequest）**

```
CanonicalRequest =
    HTTPRequestMethod + '\n' +
    CanonicalURI + '\n' +
    CanonicalQueryString + '\n' +
    CanonicalHeaders + '\n' +
    SignedHeaders + '\n' +
    HashedRequestPayload
```

对于 OCR 请求，各字段值为：
- `HTTPRequestMethod` = `POST`
- `CanonicalURI` = `/`
- `CanonicalQueryString` = ``（空字符串）
- `CanonicalHeaders` = `content-type:application/json\nhost:ocr.tencentcloudapi.com\n`（小写，按 ASCII 升序排列）
- `SignedHeaders` = `content-type;host`
- `HashedRequestPayload` = `SHA256(RequestBody).toLowerCase()`（请求体的 SHA-256 哈希）

**步骤 2：拼接待签名字符串（StringToSign）**

```
StringToSign =
    TC3-HMAC-SHA256 + '\n' +
    RequestTimestamp + '\n' +
    CredentialScope + '\n' +
    HashedCanonicalRequest
```

- `RequestTimestamp` = UNIX 时间戳（秒）
- `CredentialScope` = `{YYYY-MM-DD}/ocr/tc3_request`（日期必须用 UTC 时区！）

**步骤 3：计算签名（3 层 HMAC 密钥派生 + 最终签名）**

```javascript
SecretDate    = HMAC_SHA256("TC3" + SecretKey, Date)          // 第 1 层
SecretService = HMAC_SHA256(SecretDate, "ocr")                // 第 2 层
SecretSigning = HMAC_SHA256(SecretService, "tc3_request")     // 第 3 层
Signature     = HexEncode(HMAC_SHA256(SecretSigning, StringToSign))
```

> **关键**：每层 HMAC 的输出是**二进制数据**（不是十六进制字符串），直接作为下一层的密钥输入。

**步骤 4：拼接 Authorization**

```
Authorization: TC3-HMAC-SHA256 Credential={SecretId}/{Date}/ocr/tc3_request, SignedHeaders=content-type;host, Signature={Signature}
```

### 前端实现评估

> **⚠️ 警告：该服务的签名算法在纯前端 JS 中实现复杂度中等偏高，但技术上完全可行。** 腾讯云的 TC3-HMAC-SHA256 签名涉及 4 步字符串拼接、3 层 HMAC 密钥派生和 SHA-256 哈希，但在浏览器环境中可以利用原生 `crypto.subtle` API 实现，无需引入任何第三方加密库。代码量约 50-80 行。已有 Chrome 扩展项目成功在纯前端实现了该签名。

| 维度 | 评估 |
|------|------|
| 算法复杂度 | 中等偏高（4 步流程，多层派生密钥） |
| 前端实现难度 | ⭐⭐⭐ 中等 |
| 依赖库 | 零依赖（使用浏览器原生 `crypto.subtle`） |
| 代码量 | 约 50-80 行签名代码 |
| 安全性风险 | 高（SecretId + SecretKey 暴露在前端） |
| 常见坑点 | UTC 时区问题、Content-Type 精确匹配、时间戳同步（偏差不超过 5 分钟） |

### 必需的 HTTP Headers

```
Authorization:  TC3-HMAC-SHA256 Credential={SecretId}/{Date}/ocr/tc3_request, SignedHeaders=content-type;host, Signature={Signature}
Content-Type:   application/json; charset=utf-8
Host:           ocr.tencentcloudapi.com
X-TC-Action:    GeneralBasicOCR
X-TC-Version:   2018-11-19
X-TC-Timestamp: {unix_timestamp_seconds}
X-TC-Region:    ap-guangzhou
```

---

## 2.3 请求构造（Payload）

### Content-Type

```
application/json; charset=utf-8
```

### 图片参数

| 参数名 | 格式 | 说明 |
|--------|------|------|
| `ImageBase64` | **纯 Base64 字符串**（不含 `data:image/...;base64,` 前缀） | Base64 编码后不超过 7MB |
| `ImageUrl` | 图片完整 URL（公网可访问） | 与 ImageBase64 二选一 |

### 其他关键参数

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `LanguageType` | string | `zh` | `zh`（中英混合）、`zh_rare`（含生僻字）、`auto`（自动检测）、`jap`、`kor` 等 |
| `IsPdf` | boolean | `false` | 是否为 PDF |
| `PdfPageNumber` | integer | 所有页 | PDF 页码 |

### 请求示例

```json
{
  "ImageBase64": "/9j/4AAQSkZJRgABAQEASABIAAD...",
  "LanguageType": "zh"
}
```

---

## 2.4 响应解析（Response Parsing）

### 成功响应示例

```json
{
  "Response": {
    "TextDetections": [
      {
        "DetectedText": "识别出的文字内容",
        "Confidence": 99.9,
        "Polygon": [
          { "X": 10, "Y": 20 },
          { "X": 100, "Y": 20 },
          { "X": 100, "Y": 40 },
          { "X": 10, "Y": 40 }
        ],
        "ItemPolygon": { "Left": 10, "Top": 20, "Width": 90, "Height": 20 },
        "Words": [],
        "WordPolygonPoints": []
      }
    ],
    "Language": "zh",
    "Angel": 0,
    "PdfPageSize": 0,
    "RequestId": "xxxx-xxxx-xxxx-xxxx"
  }
}
```

### 提取路径

```
response.Response.TextDetections[i].DetectedText  → 每一行文字
response.Response.TextDetections.map(item => item.DetectedText).join('\n')  → 全部文字拼接
response.Response.Language  → 检测到的语言
```

### 常见错误码

| 错误码 | 说明 |
|--------|------|
| `InvalidParameter.SignatureFailure` | 签名验证失败（最常见） |
| `AuthFailure.SecretIdNotFound` | SecretId 不存在 |
| `AuthFailure.SignatureExpire` | 签名过期（时间戳偏差超过 5 分钟） |
| `InvalidParameterValue.ImageDecodeFailed` | 图片 Base64 解码失败 |
| `InvalidParameterValue.ImageSizeTooLarge` | 图片过大（超过 7MB） |
| `InvalidParameterValue.NoTextInImage` | 图片中未检测到文字 |
| `ResourceUnavailable.InArrears` | 账户欠费 |
| `LimitExceeded` | 超出调用频率限制 |

---

## 2.5 油猴/Tampermonkey 环境适配指南

### CORS（跨域）处理

> **⚠️ 腾讯云 OCR API 不支持浏览器端直接跨域调用。** `ocr.tencentcloudapi.com` 没有配置 CORS 响应头，普通网页中直接使用 `fetch` 或 `XMLHttpRequest` 会被浏览器阻止。

**解决方案**：在油猴脚本中使用 `GM_xmlhttpRequest` 替代标准 `fetch`。`GM_xmlhttpRequest` 不受浏览器同源策略限制，可以直接发送跨域请求。

### 代码实现策略

1. **签名实现**：使用浏览器原生 `crypto.subtle` API 实现 TC3-HMAC-SHA256 签名，无需引入第三方加密库（如 CryptoJS）。`crypto.subtle` 在所有现代浏览器中均可用（Chrome 37+、Firefox 34+、Edge 12+）。
2. **时区注意**：签名中的日期（`CredentialScope` 中的 `{Date}`）必须使用 **UTC 时区**，不能使用本地时区（东八区会导致凌晨签名失败）。使用 `new Date(timestamp * 1000).toISOString().split('T')[0]` 即可获取 UTC 日期。
3. **Content-Type 精确匹配**：签名计算时的 `Content-Type` 必须与实际请求 Header 中的完全一致，建议统一使用 `application/json`（不含 charset 后缀）或 `application/json; charset=utf-8`。
4. **时间同步**：时间戳与服务器时间差不能超过 5 分钟，通常不是问题，但注意不要在签名计算中使用缓存的时间戳。

---

## 2.6 代码示例（JavaScript / GM_xmlhttpRequest）

```javascript
// ==UserScript==
// @name         Tencent Cloud OCR Integration
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  腾讯云 OCR 集成（TC3-HMAC-SHA256 签名）
// @grant        GM_xmlhttpRequest
// @connect      ocr.tencentcloudapi.com
// ==/UserScript==

(function () {
  'use strict';

  const ENDPOINT = 'ocr.tencentcloudapi.com';
  const SERVICE = 'ocr';
  const VERSION = '2018-11-19';

  // ========== 加密工具函数 ==========

  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function hmacSHA256(key, message) {
    const keyBuffer = typeof key === 'string'
      ? new TextEncoder().encode(key) : key;
    const msgBuffer = new TextEncoder().encode(message);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgBuffer);
    return signature; // 返回 ArrayBuffer（二进制），用于链式密钥派生
  }

  async function hmacSHA256Hex(key, message) {
    const sig = await hmacSHA256(key, message);
    return Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ========== TC3 签名 ==========

  async function generateSignature(secretId, secretKey, action, payload, region = 'ap-guangzhou') {
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().split('T')[0]; // UTC 日期

    // 步骤 1：拼接规范请求串
    const hashedPayload = await sha256(payload);
    const canonicalRequest = [
      'POST', '/',
      '', // 空查询字符串
      `content-type:application/json\nhost:${ENDPOINT}\n`,
      'content-type;host',
      hashedPayload
    ].join('\n');

    // 步骤 2：拼接待签名字符串
    const credentialScope = `${date}/${SERVICE}/tc3_request`;
    const hashedCanonicalRequest = await sha256(canonicalRequest);
    const stringToSign = [
      'TC3-HMAC-SHA256',
      timestamp.toString(),
      credentialScope,
      hashedCanonicalRequest
    ].join('\n');

    // 步骤 3：计算签名密钥 + 最终签名
    const secretDate = await hmacSHA256('TC3' + secretKey, date);
    const secretService = await hmacSHA256(secretDate, SERVICE);
    const secretSigning = await hmacSHA256(secretService, 'tc3_request');
    const signature = await hmacSHA256Hex(secretSigning, stringToSign);

    // 步骤 4：拼接 Authorization
    const authorization =
      `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, ` +
      `SignedHeaders=content-type;host, Signature=${signature}`;

    return { authorization, timestamp, date };
  }

  // ========== OCR 识别 ==========

  /**
   * 腾讯云 OCR 识别
   * @param {string} imageBase64 - 不含前缀的纯 Base64 字符串
   * @param {object} apiKeyConfig - { secretId: string, secretKey: string, region?: string }
   * @returns {Promise<string>} 识别出的纯文本
   */
  async function recognizeWithTencent(imageBase64, apiKeyConfig) {
    const { secretId, secretKey, region = 'ap-guangzhou' } = apiKeyConfig;

    // 构造请求体
    const params = { ImageBase64: imageBase64, LanguageType: 'zh' };
    const payload = JSON.stringify(params);

    // 生成签名
    const { authorization, timestamp } = await generateSignature(
      secretId, secretKey, 'GeneralBasicOCR', payload, region
    );

    // 发送请求
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: `https://${ENDPOINT}`,
        headers: {
          'Content-Type': 'application/json',
          'Host': ENDPOINT,
          'X-TC-Action': 'GeneralBasicOCR',
          'X-TC-Version': VERSION,
          'X-TC-Timestamp': timestamp.toString(),
          'X-TC-Region': region,
          'Authorization': authorization
        },
        data: payload,
        onload: function (response) {
          try {
            const data = JSON.parse(response.responseText);
            const error = data.Response && data.Response.Error;
            if (error) {
              reject(new Error(`腾讯 OCR 错误 [${error.Code}]: ${error.Message}`));
              return;
            }
            const detections = data.Response && data.Response.TextDetections;
            if (detections && detections.length > 0) {
              const text = detections.map(item => item.DetectedText).join('\n');
              resolve(text);
            } else {
              reject(new Error('未识别到文字'));
            }
          } catch (e) {
            reject(new Error('响应解析失败: ' + e.message));
          }
        },
        onerror: function () {
          reject(new Error('OCR 请求网络错误'));
        },
        ontimeout: function () {
          reject(new Error('OCR 请求超时'));
        }
      });
    });
  }

  // 暴露到全局
  window.recognizeWithTencent = recognizeWithTencent;
})();
```

---

# 3. OCR.space API 集成技术文档（油猴脚本专用）

## 3.1 API 接口概览

| 方法 | 端点 URL | 说明 |
|------|----------|------|
| `POST` | `https://api.ocr.space/parse/image` | 完整功能 API（支持文件上传、Base64、URL） |
| `GET` | `https://api.ocr.space/parse/imageurl` | 简单 API（仅支持 URL 方式） |

- **请求方法**：`POST`（推荐）/ `GET`
- **Content-Type**：`multipart/form-data` 或 `application/x-www-form-urlencoded`
- **核心功能**：通用文字识别，支持 80+ 种语言，免费额度充足。

> 官方文档：https://ocr.space/ocrapi

---

## 3.2 鉴权机制详解

### 鉴权方式：API Key（极简）

OCR.space 采用最简单的 **API Key** 认证方式，只需在请求中携带一个 API Key 即可。

### 获取凭证步骤

1. 访问 https://ocr.space/ocrapi/freekey 注册免费账号
2. 注册后自动获得 API Key（显示在页面顶部）
3. 测试用 Key：`helloworld`（频率限制极严，仅用于测试）

### 前端实现评估

| 维度 | 评估 |
|------|------|
| 算法复杂度 | 无（仅需在请求中传递 API Key） |
| 前端实现难度 | ⭐ 极简 |
| 安全性风险 | 低（仅暴露一个 API Key，可随时重新生成） |
| 推荐程度 | 最适合油猴脚本集成 |

### API Key 传递方式

**方式一：HTTP Header（推荐）**

```
apikey: YOUR_API_KEY
```

**方式二：表单字段**

```
apikey=YOUR_API_KEY（作为 form-data 的一个字段）
```

**方式三：URL 查询参数（仅 GET 端点）**

```
https://api.ocr.space/parse/imageurl?apikey=YOUR_API_KEY&url=https://...
```

### 请求头示例

```http
POST /parse/image HTTP/1.1
Host: api.ocr.space
apikey: YOUR_API_KEY
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary
```

---

## 3.3 请求构造（Payload）

### Content-Type

```
multipart/form-data（推荐）或 application/x-www-form-urlencoded
```

> **注意**：OCR.space **不支持** `application/json` 作为 Content-Type。不要发送 raw JSON body。

### 图片参数

| 参数名 | 格式 | 说明 |
|--------|------|------|
| `base64Image` | **Data URL 格式**（必须包含 `data:image/...;base64,` 前缀） | 带 MIME 类型的 Data URL |
| `url` | 图片完整 URL（公网可访问） | |
| `file` | 二进制文件（multipart upload） | 带文件名的二进制文件 |

**重要**：`base64Image` 参数必须使用 **Data URL 格式**，即必须包含 `data:image/png;base64,` 前缀。**不要**发送纯 Base64 字符串。

示例：
```
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
data:image/jpeg;base64,/9j/4AAQSkZJRgABAQE...
```

### 其他关键参数

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `language` | string | `eng` | 语言代码：`eng`（英语）、`chs`（简体中文）、`cht`（繁体中文）、`jpn`（日语）、`kor`（韩语）等 |
| `isOverlayRequired` | boolean | `false` | 是否返回文字坐标 |
| `detectOrientation` | boolean | `false` | 是否自动旋转图片 |
| `scale` | boolean | `false` | 内部放大（适合低分辨率扫描件） |
| `isTable` | boolean | `false` | 逐行输出（适合表格/票据） |
| `OCREngine` | integer | `1` | `1`（默认）或 `2`（特殊字符/自动语言检测） |

### 请求示例

```bash
curl -H "apikey: YOUR_KEY" \
  --form "base64Image=data:image/png;base64,iVBORw0KGgo..." \
  --form "language=chs" \
  https://api.ocr.space/parse/image
```

---

## 3.4 响应解析（Response Parsing）

### 成功响应示例

```json
{
  "ParsedResults": [
    {
      "TextOverlay": {
        "Lines": [],
        "HasOverlay": false,
        "Message": "Text overlay is not provided as it is not requested"
      },
      "TextOrientation": "0",
      "FileParseExitCode": 1,
      "ParsedText": "识别出的完整文本...\r\n多行文本...\r\n...",
      "ErrorMessage": "",
      "ErrorDetails": ""
    }
  ],
  "OCRExitCode": 1,
  "IsErroredOnProcessing": false,
  "ProcessingTimeInMilliseconds": "1344",
  "SearchablePDFURL": "Searchable PDF not generated as it was not requested."
}
```

### 提取路径

```
response.ParsedResults[0].ParsedText  → 完整识别文本（含 \r\n 换行符）
response.OCRExitCode                  → 1 表示成功
response.IsErroredOnProcessing        → false 表示无错误
```

**提取文本**：

```javascript
const text = response.ParsedResults[0].ParsedText;
```

### 常见错误码

| OCRExitCode | HTTP 状态 | 说明 |
|-------------|-----------|------|
| 1 | 200 | 成功 |
| 2 | 200 | 图片中未检测到文字 |
| 3 | 200 | 文档超出计划限制 |
| 4 | 200 | PDF 页数过多 |
| 99 | 200 | 一般错误（文件类型无法识别等） |
| — | 403 | API Key 无效或已过期 |

> **注意**：OCR.space 的处理错误返回 HTTP 200，实际错误状态通过 JSON 中的 `OCRExitCode` 和 `IsErroredOnProcessing` 判断。只有 API Key 无效才会返回 HTTP 403。

---

## 3.5 油猴/Tampermonkey 环境适配指南

### CORS（跨域）处理

> **✅ OCR.space 部分支持 CORS。**

实测结果：
- 响应头包含 `access-control-allow-origin: *`
- **简单请求**（GET、POST + `form-data` / `x-www-form-urlencoded`）可以直接工作
- **预检请求（OPTIONS）不支持**（返回 405）
- POST + `application/json` **不可用**（需要预检请求）

**解决方案**：
- 使用 `GM_xmlhttpRequest` 完全没有限制，是油猴脚本中最推荐的方案
- 如果使用标准 `fetch`，必须使用 `form-data` 或 `x-www-form-urlencoded`，不能用 JSON

### 代码实现策略

1. **鉴权**：直接在 Header 中设置 `apikey` 字段即可，零复杂度。
2. **Base64 格式转换**：由于 OCR.space 要求 Data URL 格式（含前缀），而输入通常是纯 Base64，需要在代码中添加前缀。推荐默认添加 `data:image/png;base64,` 前缀。
3. **错误判断**：先检查 `response.OCRExitCode === 1`，再检查 `IsErroredOnProcessing === false`，最后从 `ErrorMessage` 获取错误详情。
4. **免费额度充足**：每月 25,000 次请求，每天 500 次/IP，对于个人使用绰绰有余。

---

## 3.6 代码示例（JavaScript / GM_xmlhttpRequest）

```javascript
// ==UserScript==
// @name         OCR.space Integration
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  OCR.space 集成
// @grant        GM_xmlhttpRequest
// @connect      api.ocr.space
// ==/UserScript==

(function () {
  'use strict';

  const OCR_SPACE_URL = 'https://api.ocr.space/parse/image';

  /**
   * OCR.space 文字识别
   * @param {string} imageBase64 - 不含前缀的纯 Base64 字符串
   * @param {object} apiKeyConfig - { apiKey: string }
   * @returns {Promise<string>} 识别出的纯文本
   */
  function recognizeWithOCRSpace(imageBase64, apiKeyConfig) {
    return new Promise((resolve, reject) => {
      // OCR.space 要求 Data URL 格式（含前缀）
      const dataUrl = 'data:image/png;base64,' + imageBase64;

      // 构造 multipart/form-data 边界
      const boundary = '----OCRSpaceBoundary' + Date.now();
      const delimiter = '\r\n--' + boundary + '\r\n';
      const closeDelimiter = '\r\n--' + boundary + '--';

      const body =
        delimiter +
        'Content-Disposition: form-data; name="base64Image"\r\n\r\n' +
        dataUrl +
        delimiter +
        'Content-Disposition: form-data; name="language"\r\n\r\n' +
        'chs' +
        closeDelimiter;

      GM_xmlhttpRequest({
        method: 'POST',
        url: OCR_SPACE_URL,
        headers: {
          'apikey': apiKeyConfig.apiKey,
          'Content-Type': 'multipart/form-data; boundary=' + boundary
        },
        data: body,
        onload: function (response) {
          try {
            const data = JSON.parse(response.responseText);

            if (data.OCRExitCode !== 1 || data.IsErroredOnProcessing) {
              const errMsg = Array.isArray(data.ErrorMessage)
                ? data.ErrorMessage.join('; ')
                : (data.ErrorMessage || '未知错误');
              reject(new Error(`OCR.space 错误 [ExitCode ${data.OCRExitCode}]: ${errMsg}`));
              return;
            }

            if (data.ParsedResults && data.ParsedResults.length > 0) {
              const text = data.ParsedResults[0].ParsedText;
              if (text && text.trim()) {
                resolve(text);
              } else {
                reject(new Error('未识别到文字'));
              }
            } else {
              reject(new Error('响应中无解析结果'));
            }
          } catch (e) {
            reject(new Error('响应解析失败: ' + e.message));
          }
        },
        onerror: function () {
          reject(new Error('OCR 请求网络错误'));
        },
        ontimeout: function () {
          reject(new Error('OCR 请求超时'));
        }
      });
    });
  }

  // 暴露到全局
  window.recognizeWithOCRSpace = recognizeWithOCRSpace;
})();
```

---

# 4. Google Cloud Vision API 集成技术文档（油猴脚本专用）

## 4.1 API 接口概览

| 项目 | 值 |
|------|------|
| 接口名称 | `TEXT_DETECTION`（文字检测） |
| 请求端点 | `https://vision.googleapis.com/v1/images:annotate` |
| HTTP 方法 | `POST` |
| Content-Type | `application/json` |
| 核心功能 | 检测图片中的文字，支持 50+ 种语言 |

区域特定端点：

| 区域 | 端点 |
|------|------|
| 全球（默认） | `https://vision.googleapis.com/v1/images:annotate` |
| 美国 | `https://us-vision.googleapis.com/v1/images:annotate` |
| 欧洲 | `https://eu-vision.googleapis.com/v1/images:annotate` |

> 官方文档：https://cloud.google.com/vision/docs/reference/rest/v1/images/annotate

---

## 4.2 鉴权机制详解

### 鉴权方式：API Key（URL 查询参数）

Google Cloud Vision API 支持三种认证方式，但对于浏览器端（油猴脚本）使用，**API Key 是最合适的选择**。

- **API Key**：通过 URL 查询参数 `?key=YOUR_API_KEY` 传递
- **Service Account**：需要 JSON 密钥文件，适合服务端
- **OAuth 2.0**：需要用户授权流程，不适合油猴脚本

### 获取凭证步骤

1. 访问 Google Cloud Console (https://console.cloud.google.com/)
2. 创建项目或选择已有项目
3. 启用 Cloud Vision API（APIs & Services → Library → 搜索 "Cloud Vision API" → Enable）
4. 创建 API Key（APIs & Services → Credentials → Create Credentials → API Key）
5. **强烈建议**设置 API Key 限制：
   - **API 限制**：仅限 "Cloud Vision API"
   - **应用限制**：设置为 HTTP referrer 限制（但由于油猴脚本无固定 referrer，可能需要不设置）

### 前端实现评估

| 维度 | 评估 |
|------|------|
| 算法复杂度 | 无（仅需 URL 查询参数传递 Key） |
| 前端实现难度 | ⭐ 极简 |
| 安全性风险 | 中（API Key 暴露在前端，但可设置 API 限制降低风险） |
| 国际化支持 | 最佳（支持 50+ 种语言，自动语言检测） |

### 请求头示例

```http
POST /v1/images:annotate?key=YOUR_API_KEY HTTP/1.1
Host: vision.googleapis.com
Content-Type: application/json
```

---

## 4.3 请求构造（Payload）

### Content-Type

```
application/json
```

### 图片参数

JSON 请求体中，图片通过 `requests[].image.content` 传递 **纯 Base64 字符串**（不含前缀）。

也支持通过 `requests[].image.source.imageUri` 传递图片 URL（需公网可访问），或通过 `requests[].image.source.gcsImageUri` 传递 Cloud Storage URI。

### 请求体结构

```json
{
  "requests": [
    {
      "image": {
        "content": "纯Base64字符串..."
      },
      "features": [
        {
          "type": "TEXT_DETECTION",
          "maxResults": 10
        }
      ],
      "imageContext": {
        "languageHints": ["zh", "en"]
      }
    }
  ]
}
```

### 其他关键参数

| 参数 | 位置 | 说明 |
|------|------|------|
| `features[].type` | requests[].features | `TEXT_DETECTION`（文字检测）或 `DOCUMENT_TEXT_DETECTION`（文档文字检测，更精确） |
| `imageContext.languageHints` | requests[] | 语言提示数组，如 `["zh", "en"]` |
| `imageContext.textDetectionParams` | requests[] | 文字检测高级参数 |

### 请求示例

```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [{
      "image": { "content": "/9j/4AAQ..." },
      "features": [{ "type": "TEXT_DETECTION" }]
    }]
  }' \
  "https://vision.googleapis.com/v1/images:annotate?key=YOUR_API_KEY"
```

---

## 4.4 响应解析（Response Parsing）

### 成功响应示例

```json
{
  "responses": [
    {
      "textAnnotations": [
        {
          "locale": "zh",
          "description": "完整识别文本\n多行内容\n...",
          "boundingPoly": {
            "vertices": [
              { "x": 10, "y": 20 },
              { "x": 300, "y": 20 },
              { "x": 300, "y": 100 },
              { "x": 10, "y": 100 }
            ]
          }
        },
        {
          "description": "完整",
          "boundingPoly": { "vertices": [...] }
        },
        {
          "description": "识别",
          "boundingPoly": { "vertices": [...] }
        }
      ],
      "fullTextAnnotation": {
        "pages": [
          {
            "blocks": [
              {
                "blockType": "TEXT",
                "paragraphs": [
                  {
                    "words": [
                      {
                        "symbols": [
                          { "text": "完", "confidence": 0.99 }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ],
        "text": "完整识别文本\n多行内容\n..."
      }
    }
  ]
}
```

### 提取路径

```
response.responses[0].fullTextAnnotation.text            → 完整识别文本
response.responses[0].textAnnotations[0].description     → 完整识别文本（同上）
response.responses[0].textAnnotations[0].locale          → 检测到的语言
response.responses[0].textAnnotations[1..N].description  → 单个词/短语
```

**提取文本**：

```javascript
const text = response.responses[0].fullTextAnnotation.text
          || response.responses[0].textAnnotations[0].description;
```

> **注意**：当坐标值为 0 时，Google 会省略该字段。例如 `[{}, {"x": 100}, {"x": 100, "y": 100}, {"y": 100}]` 代表 100x100 像素区域。

### 常见错误码

| HTTP 状态 | 错误码 | 说明 |
|-----------|--------|------|
| 400 | `INVALID_ARGUMENT` | 请求格式错误、图片过大（>20MB）、Base64 编码无效 |
| 403 | `PERMISSION_DENIED` | API Key 无效、API 未启用、Key 限制不匹配、未开通计费 |
| 403 | `RESOURCE_EXHAUSTED` | 配额用尽（免费额度 1000 次/月） |
| 429 | `TOO_MANY_REQUESTS` | 请求过于频繁，需实现指数退避重试 |
| 500 | `INTERNAL` | Google 服务端内部错误 |

---

## 4.5 油猴/Tampermonkey 环境适配指南

### CORS（跨域）处理

> **✅ Google Cloud Vision API 支持 CORS（使用 Browser Key 时）。**

Google Cloud API 在使用正确配置的 API Key 时会返回 `Access-Control-Allow-Origin` 响应头。关键注意事项：

- API Key 必须配置为 **Browser 类型**（创建时不设置应用限制，或设置为 HTTP referrer 限制）
- **不支持 `file://` 协议**：页面必须通过 HTTP 服务访问（`localhost` 或远程 URL）
- 使用 `GM_xmlhttpRequest` 可完全绕过 CORS 限制，是油猴脚本中的推荐方案

### 代码实现策略

1. **鉴权**：API Key 通过 URL 查询参数 `?key=` 传递，零复杂度。
2. **图片格式**：传入纯 Base64 字符串（不含 Data URL 前缀），放入 `requests[0].image.content` 字段。
3. **功能选择**：`TEXT_DETECTION` 适合一般场景；`DOCUMENT_TEXT_DETECTION` 适合文档/PDF，识别精度更高。
4. **语言提示**：如果不设置 `languageHints`，API 会自动检测语言。对于中英文混合场景，建议设置 `["zh", "en"]`。
5. **安全建议**：务必设置 API Key 的 API 限制（仅限 Cloud Vision API），防止 Key 被滥用于其他 Google Cloud 服务导致费用飙升。

---

## 4.6 代码示例（JavaScript / GM_xmlhttpRequest）

```javascript
// ==UserScript==
// @name         Google Cloud Vision OCR Integration
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Google Cloud Vision API 文字识别集成
// @grant        GM_xmlhttpRequest
// @connect      vision.googleapis.com
// ==/UserScript==

(function () {
  'use strict';

  const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

  /**
   * Google Cloud Vision OCR 识别
   * @param {string} imageBase64 - 不含前缀的纯 Base64 字符串
   * @param {object} apiKeyConfig - { apiKey: string, languageHints?: string[] }
   * @returns {Promise<string>} 识别出的纯文本
   */
  function recognizeWithGoogleVision(imageBase64, apiKeyConfig) {
    return new Promise((resolve, reject) => {
      const requestBody = {
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: 'TEXT_DETECTION' }]
          }
        ]
      };

      // 设置语言提示（可选）
      if (apiKeyConfig.languageHints && apiKeyConfig.languageHints.length > 0) {
        requestBody.requests[0].imageContext = {
          languageHints: apiKeyConfig.languageHints
        };
      }

      GM_xmlhttpRequest({
        method: 'POST',
        url: `${VISION_API_URL}?key=${apiKeyConfig.apiKey}`,
        headers: {
          'Content-Type': 'application/json'
        },
        data: JSON.stringify(requestBody),
        onload: function (response) {
          try {
            const data = JSON.parse(response.responseText);

            // 检查错误
            if (data.error) {
              reject(new Error(`Google Vision 错误 [${data.error.code}]: ${data.error.message}`));
              return;
            }

            // 提取文本
            const annotations = data.responses && data.responses[0];
            if (!annotations) {
              reject(new Error('响应中无结果'));
              return;
            }

            if (annotations.error) {
              reject(new Error(`Google Vision 错误: ${annotations.error.message}`));
              return;
            }

            const text = (annotations.fullTextAnnotation && annotations.fullTextAnnotation.text)
              || (annotations.textAnnotations && annotations.textAnnotations[0] && annotations.textAnnotations[0].description)
              || '';

            if (text.trim()) {
              resolve(text);
            } else {
              reject(new Error('未识别到文字'));
            }
          } catch (e) {
            reject(new Error('响应解析失败: ' + e.message));
          }
        },
        onerror: function () {
          reject(new Error('OCR 请求网络错误'));
        },
        ontimeout: function () {
          reject(new Error('OCR 请求超时'));
        }
      });
    });
  }

  // 暴露到全局
  window.recognizeWithGoogleVision = recognizeWithGoogleVision;
})();
```

---

# 5. Azure AI Vision API 集成技术文档（油猴脚本专用）

## 5.1 API 接口概览

| 操作 | 方法 | URL |
|------|------|-----|
| **提交读取（异步）** | `POST` | `https://{endpoint}/vision/v3.2/read/syncAnalyze` |
| **获取结果** | `GET` | `https://{endpoint}/vision/v3.2/read/analyzeResults/{operationId}` |

- **`{endpoint}`** = 你的区域端点，如 `https://your-resource.cognitiveservices.azure.com`
- **HTTP 方法**：`POST`（提交）+ `GET`（轮询结果）
- **Content-Type**：`application/json`（URL/Base64 方式）或 `application/octet-stream`（二进制方式）
- **核心功能**：高精度文字识别，支持 80+ 种语言，支持多页 PDF/TIFF

> 官方文档：https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/how-to/call-read-api

---

## 5.2 鉴权机制详解

### 鉴权方式：Subscription Key（请求头）

Azure AI Vision 使用 **Subscription Key**（订阅密钥）进行认证，通过 HTTP 请求头传递。

### 获取凭证步骤

1. 访问 Azure Portal (https://portal.azure.com/)
2. 创建 "Azure AI Services" 资源（或 "Computer Vision" 资源）
3. 选择区域和定价层（F0 免费层或 S1 标准层）
4. 创建完成后，在资源页面找到 "Keys and Endpoint" → 复制 Key1 或 Key2

### 前端实现评估

| 维度 | 评估 |
|------|------|
| 算法复杂度 | 低（仅需 Header 传递 Key） |
| 前端实现难度 | ⭐⭐ 简单（但异步轮询增加复杂度） |
| 安全性风险 | 中（Subscription Key 暴露在前端） |
| 异步复杂度 | 中（需要实现两步请求 + 轮询机制） |

### 请求头示例

```http
POST /vision/v3.2/read/syncAnalyze HTTP/1.1
Host: your-resource.cognitiveservices.azure.com
Ocp-Apim-Subscription-Key: YOUR_SUBSCRIPTION_KEY
Content-Type: application/json
```

---

## 5.3 请求构造（Payload）

### Content-Type

- `application/json`（传递图片 URL 或 Data URL）
- `application/octet-stream`（传递二进制图片流）

### 图片参数

**方式一：图片 URL（JSON body）**

```json
{
  "url": "https://example.com/image.jpg"
}
```

**方式二：二进制流（application/octet-stream）**

请求体直接放置图片二进制数据。

**方式三：Data URL（放入 url 字段）**

```json
{
  "url": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `language` | string | `unk`（自动检测） | BCP-47 语言代码，如 `en`、`zh-Hans`、`ja` |
| `readingOrder` | string | `basic` | `basic`（从左到右、从上到下）或 `natural`（智能排序） |
| `pages` | string | `all` | PDF/TIFF 的页码范围，如 `1-3,5` |

### 请求示例

```bash
# 步骤 1：提交图片
curl -X POST "https://your-resource.cognitiveservices.azure.com/vision/v3.2/read/syncAnalyze?language=unk&readingOrder=natural" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: YOUR_KEY" \
  -d '{"url": "https://example.com/image.jpg"}'

# 步骤 2：轮询结果
curl -X GET "https://your-resource.cognitiveservices.azure.com/vision/v3.2/read/analyzeResults/{operationId}" \
  -H "Ocp-Apim-Subscription-Key: YOUR_KEY"
```

---

## 5.4 响应解析（Response Parsing）

### 异步流程

```
步骤 1: POST → 返回 HTTP 202 + Operation-Location Header（包含 operationId）
步骤 2: GET  → 轮询，返回 HTTP 202（处理中）或 HTTP 200（完成）
```

### 提交响应（HTTP 202）

```http
HTTP/1.1 202 Accepted
Operation-Location: https://.../vision/v3.2/read/analyzeResults/GUID-HERE
```

### 处理中响应（HTTP 202）

```json
{
  "status": "running"
}
```

### 完成响应（HTTP 200）

```json
{
  "status": "succeeded",
  "createdDateTime": "2024-01-15T10:30:00Z",
  "lastUpdatedDateTime": "2024-01-15T10:30:05Z",
  "analyzeResult": {
    "version": "3.2.0",
    "readResults": [
      {
        "page": 1,
        "angle": 0.0,
        "width": 800,
        "height": 600,
        "unit": "pixel",
        "lines": [
          {
            "text": "Hello World",
            "boundingBox": [10, 20, 300, 20, 300, 50, 10, 50],
            "words": [
              { "text": "Hello", "boundingBox": [10, 20, 100, 20, 100, 50, 10, 50], "confidence": 0.98 },
              { "text": "World", "boundingBox": [120, 20, 300, 20, 300, 50, 120, 50], "confidence": 0.97 }
            ]
          }
        ]
      }
    ]
  }
}
```

### 提取路径

```
response.analyzeResult.readResults[].lines[].text              → 每一行文本
response.analyzeResult.readResults[].lines[].words[].text       → 每个单词
response.analyzeResult.readResults[].lines[].words[].confidence → 置信度 (0-1)
```

**提取文本**：

```javascript
const allText = response.analyzeResult.readResults
  .flatMap(page => page.lines)
  .map(line => line.text)
  .join('\n');
```

### 常见错误码

| HTTP 状态 | 错误码 | 说明 |
|-----------|--------|------|
| 400 | `InvalidImageUrl` | 图片 URL 格式错误或不可访问 |
| 400 | `InvalidImageFormat` | 图片格式不支持（需 JPEG/PNG/BMP/GIF/TIFF/PDF） |
| 400 | `InvalidImageSize` | 图片过大（>20MB）或过小（<50x50px） |
| 401 | `AccessDenied` | Subscription Key 无效或缺失 |
| 403 | `Forbidden` | 配额已用尽或功能不适用于当前定价层 |
| 404 | `NotFound` | Operation ID 不存在或已过期 |
| 429 | `RateLimitExceeded` | 请求过于频繁，需检查 `Retry-After` 头 |
| 500 | `FailedToProcess` | 图片处理失败 |

---

## 5.5 油猴/Tampermonkey 环境适配指南

### CORS（跨域）处理

> **⚠️ Azure AI Vision API 不支持浏览器端直接跨域调用。** Azure Cognitive Services API 不包含 `Access-Control-Allow-Origin` 响应头，浏览器端直接使用 `fetch` 或 `XMLHttpRequest` 会被阻止。

**解决方案**：在油猴脚本中使用 `GM_xmlhttpRequest` 替代标准 `fetch`，可完全绕过 CORS 限制。

### 代码实现策略

1. **异步轮询机制**：Azure Read API 是两步异步操作（提交 → 轮询），需要实现轮询逻辑。建议使用指数退避策略（1s → 2s → 4s → 8s...），最长等待约 60 秒。
2. **提取 operationId**：从 POST 响应的 `Operation-Location` Header 中提取 operationId（最后一个 `/` 后面的 GUID）。
3. **鉴权**：每个请求（包括提交和轮询）都需要携带 `Ocp-Apim-Subscription-Key` Header。
4. **图片传递**：由于油猴脚本中通常拿到的是 Base64 数据，推荐将 Base64 数据转换为 Data URL 格式，放入 JSON 的 `url` 字段中传递。或者直接发送 `application/octet-stream` 二进制流。
5. **免费额度**：F0 免费层每月 5,000 次调用，每分钟 20 次，每个 Azure 订阅仅能创建 1 个 F0 资源。

---

## 5.6 代码示例（JavaScript / GM_xmlhttpRequest）

```javascript
// ==UserScript==
// @name         Azure AI Vision OCR Integration
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Azure AI Vision Read API 集成
// @grant        GM_xmlhttpRequest
// @connect      *.cognitiveservices.azure.com
// ==/UserScript==

(function () {
  'use strict';

  /**
   * Azure AI Vision OCR 识别
   * @param {string} imageBase64 - 不含前缀的纯 Base64 字符串
   * @param {object} apiKeyConfig - { endpoint: string, subscriptionKey: string }
   * @returns {Promise<string>} 识别出的纯文本
   */
  function recognizeWithAzure(imageBase64, apiKeyConfig) {
    const { endpoint, subscriptionKey } = apiKeyConfig;
    const submitUrl = `${endpoint}/vision/v3.2/read/syncAnalyze?language=unk&readingOrder=natural`;

    // 将纯 Base64 转为 Data URL
    const dataUrl = 'data:image/png;base64,' + imageBase64;

    return new Promise((resolve, reject) => {
      // 步骤 1：提交图片
      GM_xmlhttpRequest({
        method: 'POST',
        url: submitUrl,
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': subscriptionKey
        },
        data: JSON.stringify({ url: dataUrl }),
        onload: function (response) {
          if (response.status !== 202) {
            try {
              const err = JSON.parse(response.responseText);
              reject(new Error(`Azure 提交失败 [${response.status}]: ${err.message || err.error?.message || JSON.stringify(err)}`));
            } catch (e) {
              reject(new Error(`Azure 提交失败 [${response.status}]`));
            }
            return;
          }

          // 从 Operation-Location 提取 operationId
          const operationLocation = response.responseHeaders.match(/Operation-Location:\s*(.+)/i);
          if (!operationLocation || !operationLocation[1]) {
            reject(new Error('未找到 Operation-Location 头'));
            return;
          }

          const resultUrl = operationLocation[1].trim();

          // 步骤 2：轮询结果
          pollForResult(resultUrl, subscriptionKey, resolve, reject, 0);
        },
        onerror: function () {
          reject(new Error('提交请求网络错误'));
        },
        ontimeout: function () {
          reject(new Error('提交请求超时'));
        }
      });
    });
  }

  /**
   * 轮询获取结果（指数退避）
   */
  function pollForResult(resultUrl, subscriptionKey, resolve, reject, attempt) {
    if (attempt > 15) { // 约 60 秒超时
      reject(new Error('OCR 处理超时'));
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, attempt), 8000);

    setTimeout(() => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: resultUrl,
        headers: {
          'Ocp-Apim-Subscription-Key': subscriptionKey
        },
        onload: function (response) {
          try {
            const data = JSON.parse(response.responseText);

            if (data.status === 'succeeded') {
              // 提取文本
              const readResults = data.analyzeResult && data.analyzeResult.readResults;
              if (readResults && readResults.length > 0) {
                const text = readResults
                  .flatMap(page => page.lines || [])
                  .map(line => line.text)
                  .join('\n');
                if (text.trim()) {
                  resolve(text);
                } else {
                  reject(new Error('未识别到文字'));
                }
              } else {
                reject(new Error('响应中无读取结果'));
              }
            } else if (data.status === 'running') {
              // 继续轮询
              pollForResult(resultUrl, subscriptionKey, resolve, reject, attempt + 1);
            } else {
              reject(new Error(`Azure 处理失败: status=${data.status}`));
            }
          } catch (e) {
            reject(new Error('结果解析失败: ' + e.message));
          }
        },
        onerror: function () {
          // 网络错误，重试
          pollForResult(resultUrl, subscriptionKey, resolve, reject, attempt + 1);
        },
        ontimeout: function () {
          pollForResult(resultUrl, subscriptionKey, resolve, reject, attempt + 1);
        }
      });
    }, delay);
  }

  // 暴露到全局
  window.recognizeWithAzure = recognizeWithAzure;
})();
```

---

# 6. 总结对比与推荐

## 6.1 综合对比表

| 维度 | 百度智能云 OCR | 腾讯云 OCR | OCR.space | Google Cloud Vision | Azure AI Vision |
|------|---------------|-----------|-----------|--------------------|--------------------|
| **鉴权复杂度** | ⭐⭐ 中低（OAuth Token） | ⭐⭐⭐⭐ 高（TC3 签名） | ⭐ 极简（API Key） | ⭐ 极简（API Key） | ⭐⭐ 低（Header Key） |
| **请求复杂度** | ⭐⭐ 中（需先获取 Token） | ⭐⭐⭐ 中高（签名计算） | ⭐ 极简 | ⭐ 极简 | ⭐⭐⭐ 中（异步轮询） |
| **油猴集成难度** | ⭐⭐ 中等 | ⭐⭐⭐ 中高 | ⭐ 极简 | ⭐ 极简 | ⭐⭐ 中等 |
| **CORS 支持** | ❌ 不支持 | ❌ 不支持 | ✅ 部分支持 | ✅ 支持 | ❌ 不支持 |
| **中文识别质量** | ⭐⭐⭐⭐ 优秀 | ⭐⭐⭐⭐ 优秀 | ⭐⭐ 良好 | ⭐⭐⭐⭐ 优秀 | ⭐⭐⭐⭐ 优秀 |
| **免费额度** | 通用文字：1,000 次/天 | 约 1,000 次/月 | 25,000 次/月 | 1,000 次/月 | 5,000 次/月 |
| **响应速度** | 快（同步） | 快（同步） | 中等（1-3 秒） | 快（同步） | 慢（异步轮询） |
| **图片大小限制** | 4MB | 7MB | 1MB（免费） | 20MB | 20MB |
| **多语言支持** | 好（中/英/日/韩等） | 好（中/英/日/韩等） | 好（80+ 语言） | 最佳（50+ 语言） | 最佳（80+ 语言） |
| **需要 GM_xmlhttpRequest** | ✅ 是 | ✅ 是 | 推荐（非必需） | 推荐（非必需） | ✅ 是 |

## 6.2 推荐结论

### 🏆 最适合油猴脚本集成的服务

**推荐 1：OCR.space**

- **理由**：鉴权最简单（仅需一个 API Key），请求构造最简单，免费额度最充足（25,000 次/月），代码量最少。虽然中文识别质量略逊于国内服务，但对于油猴脚本场景已经足够。
- **适用场景**：个人使用、快速原型、开源脚本分发。
- **注意事项**：免费版单张图片限制 1MB；中文识别建议设置 `language=chs`。

**推荐 2：Google Cloud Vision API**

- **理由**：鉴权同样简单（API Key URL 参数），识别质量极高（尤其是多语言和复杂文档），支持 CORS（配置 Browser Key 后可直接 fetch）。Google 的文字检测能力在业界处于领先水平。
- **适用场景**：对识别精度要求高、需要处理多语言文本的场景。
- **注意事项**：免费额度较少（1,000 次/月）；需要 Google Cloud 账号和信用卡（用于配额启用，但不一定产生费用）；需要科学上网能力。

### ⚠️ 不推荐直接集成的服务

**不推荐：Azure AI Vision（如果不必要的话）**

- **理由**：采用异步两步操作（提交 + 轮询），显著增加了代码复杂度和响应延迟。虽然识别质量优秀，但对于油猴脚本中"选中图片 → 立即获取结果"的使用场景，异步轮询的体验不佳。
- **例外情况**：如果项目已有 Azure 基础设施或需要处理大量 PDF/TIFF 文档，Azure 仍然是很好的选择。

### ⚡ 中等推荐

**百度智能云 OCR**

- **理由**：中文识别质量优秀，同步请求，接口成熟稳定。Token 缓存机制实现简单。对于中文为主的场景是很好的选择。
- **缺点**：需要管理 API Key + Secret Key，安全性略低于单 Key 方案；Token 获取步骤增加了代码复杂度。

**腾讯云 OCR**

- **理由**：识别质量优秀，签名算法在浏览器中可以实现（利用 `crypto.subtle`），无第三方依赖。
- **缺点**：TC3-HMAC-SHA256 签名代码量较大（50-80 行），时区问题和 Content-Type 精确匹配等坑点较多。建议仅在有腾讯云使用经验的情况下选择。

## 6.3 油猴脚本最佳实践建议

1. **多服务兜底**：建议在脚本中实现多 OCR 服务的 fallback 机制。优先使用 OCR.space（最简单），失败后降级到百度或 Google Vision。
2. **密钥管理**：不要在公开脚本中硬编码 API Key。建议通过脚本设置面板让用户自行输入密钥，或使用 `GM_setValue` / `GM_getValue` 存储。
3. **统一封装**：将所有 OCR 服务封装为统一接口（如 `recognize(imageBase64, config) => Promise<string>`），便于切换和测试。
4. **错误处理**：所有服务调用都应包含 `onerror`、`ontimeout` 和响应状态码检查。建议增加重试机制（特别是对于网络波动）。
5. **Base64 格式注意**：各家服务对 Base64 格式要求不同。百度/腾讯/Google 接受纯 Base64，OCR.space 需要 Data URL 前缀，Azure 可接受 Data URL。建议在统一封装层处理格式转换。
