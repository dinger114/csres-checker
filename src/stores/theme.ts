import type { ThemeMode } from '../types'
import { defineStore } from 'pinia'
import { getPreferredTheme } from '../utils/theme'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: getPreferredTheme() as ThemeMode,
  }),
  actions: {
    applyTheme(t: ThemeMode) {
      this.theme = t
      document.documentElement.setAttribute('data-theme', t)
      // S19: 隐私模式/禁用存储时降级,不抛错中断主题初始化
      try {
        localStorage.setItem('theme', t)
      }
      catch {
        /* storage unavailable */
      }
    },
    toggleTheme() {
      this.applyTheme(this.theme === 'dark' ? 'light' : 'dark')
    },
    initTheme() {
      this.applyTheme(getPreferredTheme())

      // S19: 监听器内的 localStorage 读取同样包 try/catch,隐私模式下系统主题切换不抛错
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
        let stored: string | null = null
        try {
          stored = localStorage.getItem('theme')
        }
        catch {
          /* storage unavailable: 视为未持久化,跟随系统主题 */
        }
        if (!stored) {
          this.applyTheme(e.matches ? 'light' : 'dark')
        }
      })
    },
  },
})
