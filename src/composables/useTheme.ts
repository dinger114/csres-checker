import { ref, computed } from 'vue'
import type { ThemeMode } from '../types'
import { getPreferredTheme } from '../utils/theme'

const theme = ref<ThemeMode>(getPreferredTheme())

export function useTheme() {
  function applyTheme(t: ThemeMode) {
    theme.value = t
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('theme', t)
  }

  function toggleTheme() {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function initTheme() {
    applyTheme(getPreferredTheme())

    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        applyTheme(e.matches ? 'light' : 'dark')
      }
    })
  }

  return {
    theme: computed(() => theme.value),
    toggleTheme,
    initTheme,
  }
}
