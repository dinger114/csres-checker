import type { StandardResult } from '../types'
import { normalizeKeyword, normalizeStdNo, stdBase } from '../utils/normalize'
import { useProxy } from './useProxy'
import { useLog } from './useLog'

const CSSN_URL = 'https://www.cssn.net.cn/api/standards/'

export function useCssn() {
  const { race } = useProxy()
  const { add } = useLog()

  async function query(keyword: string): Promise<StandardResult[]> {
    const normalized = normalizeKeyword(keyword)
    const url = `${CSSN_URL}?keyword=${encodeURIComponent(normalized)}`

    try {
      add(`cssn: "${normalized}"`, 'info')
      const t0 = Date.now()
      const resp = await race(url)
      if (!resp) {
        add(`cssn: 代理全部失败`, 'error')
        return []
      }
      const data = JSON.parse(resp)
      add(`cssn response: ${data.results?.length || 0} results, ${Date.now() - t0}ms`, 'info')

      const allResults = data.results || []
      if (!Array.isArray(allResults) || allResults.length === 0) return []

      const queryNorm = normalizeStdNo(normalized)

      const filtered = allResults.filter((r: any) => {
        const stdNorm = normalizeStdNo(r.a100 || '')
        if (queryNorm.includes(stdNorm) || stdNorm.includes(queryNorm)) return true
        const qPrefix = (queryNorm.match(/^[a-z\/]+/i) || [''])[0]
        const sPrefix = (stdNorm.match(/^[a-z\/]+/i) || [''])[0]
        const qNum = queryNorm.replace(/^[a-z\/]+/i, '')
        const sNum = stdNorm.replace(/^[a-z\/]+/i, '')
        if (qNum && sNum && qNum === sNum && qPrefix.slice(0, 2) === sPrefix.slice(0, 2)) return true
        return false
      })

      const currentMap = new Map<string, string>()
      allResults.forEach((r: any) => {
        if (r.a000 === '现行') {
          const base = stdBase(r.a100 || '')
          if (base) currentMap.set(base, r.a100 || '')
        }
      })

      return filtered.map((r: any) => ({
        query: keyword,
        standard_number: r.a100 || '',
        title: r.a298 || '',
        status: r.a000 || '',
        publish_date: r.a101 || '',
        implement_date: r.a205 || '',
        replaced_by: (['被代替', '作废', '废止'].includes(r.a000) ? currentMap.get(stdBase(r.a100 || '')) || '' : ''),
        publisher: '',
        category: '',
        ics: '',
      }))
    } catch (e: any) {
      add(`cssn error: ${e.message}`, 'error')
      return []
    }
  }

  return { query }
}
