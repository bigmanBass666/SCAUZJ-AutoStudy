import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '优雅大师刷课助手 - 教程',
  description: 'OCR API Key 领取教程',
  lang: 'zh-CN',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: 'OCR.space', link: '/tutorial/ocrspace-apikey-tutorial' },
      { text: '百度 OCR', link: '/tutorial/baidu-ocr-apikey-tutorial' },
      { text: '腾讯云 OCR', link: '/tutorial/tencent-ocr-apikey-tutorial' },
      { text: 'Google Cloud Vision', link: '/tutorial/google-cloud-vision-apikey-tutorial' },
      { text: 'Azure AI Vision', link: '/tutorial/azure-ai-vision-apikey-tutorial' }
    ],
    sidebar: [
      {
        text: '教程索引',
        items: [
          { text: '概述', link: '/tutorial/index' },
          { text: 'OCR.space', link: '/tutorial/ocrspace-apikey-tutorial' },
          { text: '百度 OCR', link: '/tutorial/baidu-ocr-apikey-tutorial' },
          { text: '腾讯云 OCR', link: '/tutorial/tencent-ocr-apikey-tutorial' },
          { text: 'Google Cloud Vision', link: '/tutorial/google-cloud-vision-apikey-tutorial' },
          { text: 'Azure AI Vision', link: '/tutorial/azure-ai-vision-apikey-tutorial' }
        ]
      }
    ]
  }
})
