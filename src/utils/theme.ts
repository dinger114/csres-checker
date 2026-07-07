import type { ThemeMode } from '../types'

export function getPreferredTheme(): ThemeMode {
  const saved = localStorage.getItem('theme') as ThemeMode | null
  if (saved === 'dark' || saved === 'light') return saved
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}
