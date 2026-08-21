import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import type { Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import devConfig from './dev'
import prodConfig from './prod'

const isH5 = process.env.TARO_ENV === 'h5'

const taroRootFontScriptPattern =
  /<script>!function\(n\)\{function f\(\)\{[\s\S]*?document\.documentElement[\s\S]*?style\.fontSize[\s\S]*?setTimeout\(f,500\)[\s\S]*?<\/script>\s*/

const h5CssPixelTemplatePlugin: Plugin = {
  name: 'h5-css-pixel-template',
  transformIndexHtml: {
    order: 'post',
    handler(html) {
      return html.replace(taroRootFontScriptPattern, '')
    },
  },
}

const pwaPlugin = VitePWA({
  strategies: 'injectManifest',
  srcDir: 'platform/pwa',
  filename: 'sw.js',
  registerType: 'prompt',
  injectRegister: 'auto',
  manifest: {
    id: '/',
    name: "花光马斯克的钱 / Spend Musk's Money",
    short_name: '花光 $400B',
    description: '非官方、无真实交易的 $400B 本地娱乐消费模拟游戏。',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f3f0e8',
    theme_color: '#13213c',
    lang: 'zh-CN',
    orientation: 'any',
    categories: ['games', 'entertainment'],
    prefer_related_applications: false,
    icons: [
      {
        src: '/static/pwa-icon.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/static/pwa-icon-maskable.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  },
  injectManifest: {
    globPatterns: ['**/*.{js,css,html,svg,json}'],
    injectionPoint: 'globalThis.__WB_MANIFEST',
  },
})

const config: UserConfigExport<'vite'> = {
  projectName: 'spend-musk-money',
  date: '2026-08-18',
  designWidth: 750,
  deviceRatio: {
    375: 2,
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: isH5 ? 'dist/h5' : 'dist/weapp',
  plugins: [],
  defineConstants: {
    __M5_WEAPP_BENCHMARK__: JSON.stringify(process.env.M5_WEAPP_BENCHMARK === '1'),
    __M5_WEAPP_SMOKE__: JSON.stringify(process.env.M5_WEAPP_SMOKE === '1'),
  },
  copy: {
    patterns: isH5
      ? [
          {
            from: 'static/pwa-icon.svg',
            to: 'dist/h5/static/pwa-icon.svg',
          },
          {
            from: 'static/pwa-icon-maskable.svg',
            to: 'dist/h5/static/pwa-icon-maskable.svg',
          },
        ]
      : [],
    options: {},
  },
  framework: 'react',
  compiler: {
    type: 'vite',
    vitePlugins: isH5 ? [h5CssPixelTemplatePlugin, pwaPlugin] : [],
  },
  cache: {
    enable: false,
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {},
      },
    },
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    postcss: {
      pxtransform: {
        enable: false,
        config: {},
      },
      autoprefixer: {
        enable: true,
        config: {},
      },
    },
  },
}

export default defineConfig<'vite'>(async (merge) => {
  if (process.env.NODE_ENV === 'development') {
    return merge({}, config, devConfig)
  }

  return merge({}, config, prodConfig)
})
