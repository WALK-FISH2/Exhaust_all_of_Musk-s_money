import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import { VitePWA } from 'vite-plugin-pwa'

import devConfig from './dev'
import prodConfig from './prod'

const isH5 = process.env.TARO_ENV === 'h5'

const pwaPlugin = VitePWA({
  strategies: 'injectManifest',
  srcDir: 'platform/pwa',
  filename: 'sw.js',
  registerType: 'prompt',
  injectRegister: 'auto',
  manifest: {
    id: '/',
    name: 'Spend Musk Money',
    short_name: 'Spend Money',
    description: 'A cross-platform entertainment simulation.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f5f7fb',
    theme_color: '#172033',
    lang: 'zh-CN',
    icons: [
      {
        src: '/static/pwa-icon.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/static/pwa-icon.svg',
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
  defineConstants: {},
  copy: {
    patterns: isH5
      ? [
          {
            from: 'static/pwa-icon.svg',
            to: 'dist/h5/static/pwa-icon.svg',
          },
        ]
      : [],
    options: {},
  },
  framework: 'react',
  compiler: {
    type: 'vite',
    vitePlugins: isH5 ? [pwaPlugin] : [],
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
