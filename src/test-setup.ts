import { config } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-CN': zhCN,
  },
})

export function createTestPinia() {
  return createPinia()
}

export function createTestI18n() {
  return i18n
}

// Auto-install for all tests
config.global.plugins = [createPinia(), i18n]
