export function normalizeKeyword(kw: string): string {
  return kw
    .trim()
    .replace(/[—–⁃]/g, '-')
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/GBT/gi, 'GB/T')
    .replace(/GB\/(?!T)/g, 'GB ')
}

export function formatKeyword(kw: string): string {
  return kw.replace(/([a-z])(\d)/gi, '$1 $2')
}

export function normalizeStdNo(s: string): string {
  return s.toLowerCase().replace(/\s/g, '').replace(/[–—]/g, '-')
}

export function stdBase(s: string): string {
  return s.replace(/-\d{4}$/, '')
}
