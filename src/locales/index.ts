import { createI18n } from 'vue-i18n'
import en from './en.json'
import zhCN from './zh-CN.json'

function getDefaultLocale(): string {
  const saved = localStorage.getItem('csres-locale')
  if (saved)
    return saved
  const lang = navigator.language
  if (lang.startsWith('zh'))
    return 'zh-CN'
  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: getDefaultLocale(),
  fallbackLocale: 'en',
  messages: {
    'en': en,
    'zh-CN': zhCN,
  },
})

export function setLocale(locale: string) {
  ;(i18n.global.locale as any).value = locale
  localStorage.setItem('csres-locale', locale)
}
