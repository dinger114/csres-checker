import type { StandardResult } from '../types'
import { normalizeKeyword, normalizeStdNo, stdBase } from '../utils/normalize'

const CSSN_URL = 'https://www.cssn.net.cn/api/standards/'

export function useCssn() {
  async function query(keyword: string): Promise<StandardResult[]> {
    const normalized = normalizeKeyword(keyword)
    const url = `${CSSN_URL}?keyword=${encodeURIComponent(normalized)}`

    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      })
      const data = await res.json()

      if (!data || !Array.isArray(data)) return []

      const results: StandardResult[] = []
      const currentMap = new Map<string, string>()

      data.forEach((item: any) => {
        const base = stdBase(normalizeStdNo(item.a100 || ''))
        const status = item.a000 || ''
        if (status === '现行' || status === '即将实施') {
          currentMap.set(base, item.a100)
        }
      })

      const kwNorm = normalizeStdNo(normalized)

      data.forEach((item: any) => {
        const stdNo = item.a100 || ''
        const stdNorm = normalizeStdNo(stdNo)
        if (stdNorm.includes(kwNorm) || kwNorm.includes(stdNorm)) {
          let replaced_by = ''
          const status = item.a000 || ''
          if (status === '被代替') {
            const base = stdBase(stdNorm)
            replaced_by = currentMap.get(base) || ''
          }

          results.push({
            query: keyword,
            standard_number: stdNo,
            title: item.a298 || '',
            status,
            publish_date: item.a101 || '',
            implement_date: item.a205 || '',
            replaced_by,
            publisher: '',
            category: '',
            ics: '',
          })
        }
      })

      return results
    } catch {
      return []
    }
  }

  return { query }
}
