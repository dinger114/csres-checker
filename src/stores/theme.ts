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
      localStorage.setItem('theme', t)
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
