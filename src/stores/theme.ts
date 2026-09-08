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

      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
          this.applyTheme(e.matches ? 'light' : 'dark')
        }
      })
    },
  },
})
