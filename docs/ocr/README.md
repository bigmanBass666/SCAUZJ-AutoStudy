# OCR引擎文档 (v4.0-server-sync)

## 多路降级架构

OCR模块采用多路fallback架构，按优先级依次尝试，任一成功即返回：

```
Baidu OCR → Tencent OCR → Puter.js → Tesseract.js
```

| 优先级 | 后端 | 类型 | 需要Key | 免费额度 | 备注 |
|--------|------|------|---------|---------|------|
| 1 | 百度智能云 OCR | 云端 | apiKey + secretKey | ~1000次/月 | 推荐，识别率最高 |
| 2 | 腾讯云 OCR | 云端 | secretId + secretKey | ~1000次/月 | 需TC3签名 |
| 3 | Puter.js | 云端 | 无 | 无限 | 国外服务，延迟较高 |
| 4 | Tesseract.js | 本地 | 无 | 无限 | 首次下载语言包(~数MB) |

## 配置

```javascript
const OCR_CONFIG = {
  baidu: {
    apiKey: '',
    secretKey: '',
    accessToken: '',
    endpoint: 'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic',
  },
  tencent: {
    secretId: '',
    secretKey: '',
    endpoint: 'https://ocr.tencentcloudapi.com',
    region: 'ap-guangzhou',
    action: 'GeneralBasicOCR',
    version: '2018-11-19',
  },
  puter: {
    enabled: true,
  },
  tesseract: {
    enabled: true,
    lang: 'eng',
  },
};
```

## ⚠️ 重要：showModal原型劫持与Puter OCR的兼容性

showModal原型劫持会阻断Puter SDK的`dialog.showModal()`调用，导致Puter OCR运行时无法初始化。如果Puter OCR超时，这是预期行为 — 降级到Tesseract本地OCR。

## API Key 配置教程

详见 [docs/ocr/api-tutorials/](api-tutorials/)

## 使用示例

```javascript
const code = await window.MyOcr.recognize(preprocessedCanvasOrBlob, {
  prefer: ['baidu', 'tencent', 'puter', 'tesseract'],
  timeout: 12000,
});
```

详细实现参考 [ocrEngine.md](ocrEngine.md)
