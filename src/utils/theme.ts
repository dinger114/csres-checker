import type { ThemeMode } from '../types'

export function getPreferredTheme(): ThemeMode {
  // S19: 隐私模式/禁用存储时 localStorage 访问抛 SecurityError,降级到系统偏好
  let saved: string | null = null
  try {
    saved = localStorage.getItem('theme')
  }
  catch {
    saved = null
  }
  if (saved === 'dark' || saved === 'light')
    return saved
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}
