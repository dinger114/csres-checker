import type { StandardResult, StandardVersion } from '../types'
import { normalizeKeyword, normalizeStdNo, stdBase } from '../utils/normalize'
import { useProxy } from './useProxy'
import { useLog } from './useLog'

const CSSN_URL = 'https://www.cssn.net.cn/api/standards/'

export function useCssn() {
  const { race, fetchDirect } = useProxy()
  const { add } = useLog()

  async function fetchRaw(keyword: string): Promise<any[]> {
    const normalized = normalizeKeyword(keyword)
    const url = `${CSSN_URL}?keyword=${encodeURIComponent(normalized)}`

    // cssn.net.cn supports CORS, try direct fetch first
    let resp: string | null = null
    try {
      resp = await fetchDirect(url)
      if (resp && resp.startsWith('{')) {
        // OK
      } else {
        resp = null
      }
    } catch {
      resp = null
    }

    // Fall back to proxy if direct fails
    if (!resp) {
      resp = await race(url)
    }

    if (!resp) return []

    const data = JSON.parse(resp)
    return data.results || []
  }

  function filterResults(allResults: any[], normalized: string): any[] {
    const queryNorm = normalizeStdNo(normalized)

    return allResults.filter((r: any) => {
      const stdNorm = normalizeStdNo(r.a100 || '')
      if (queryNorm.includes(stdNorm) || stdNorm.includes(queryNorm)) return true
      const qPrefix = (queryNorm.match(/^[a-z\/]+/i) || [''])[0]
      const sPrefix = (stdNorm.match(/^[a-z\/]+/i) || [''])[0]
      const qNum = queryNorm.replace(/^[a-z\/]+/i, '')
      const sNum = stdNorm.replace(/^[a-z\/]+/i, '')
      if (qNum && sNum && qNum === sNum && qPrefix.slice(0, 2) === sPrefix.slice(0, 2)) return true
      return false
    })
  }

  function groupByBase(results: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>()
    for (const r of results) {
      const base = stdBase(r.a100 || '')
      if (!base) continue
      if (!groups.has(base)) groups.set(base, [])
      groups.get(base)!.push(r)
    }
    return groups
  }

  function toVersions(results: any[]): StandardVersion[] {
    return results
      .map((r) => ({
        standard_number: r.a100 || '',
        title: r.a298 || '',
        status: r.a000 || '',
        publish_date: r.a101 || '',
        implement_date: r.a205 || '',
      }))
      .sort((a, b) => b.standard_number.localeCompare(a.standard_number))
  }

  async function query(keyword: string): Promise<StandardResult[]> {
    const normalized = normalizeKeyword(keyword)

    try {
      add(`cssn: "${normalized}"`, 'info')
      const t0 = Date.now()

      const allResults = await fetchRaw(normalized)
      add(`cssn response: ${allResults.length} results, ${Date.now() - t0}ms`, 'info')

      if (allResults.length === 0) return []

      const filtered = filterResults(allResults, normalized)
      if (filtered.length === 0) return []

      // Group by base to find versions
      const groups = groupByBase(allResults)
      const currentMap = new Map<string, string>()
      allResults.forEach((r: any) => {
        if (r.a000 === '现行') {
          const base = stdBase(r.a100 || '')
          if (base) currentMap.set(base, r.a100 || '')
        }
      })

      return filtered.map((r: any) => {
        const base = stdBase(r.a100 || '')
        const versions = base ? toVersions(groups.get(base) || []) : []

        return {
          query: keyword,
          standard_number: r.a100 || '',
          title: r.a298 || '',
          status: r.a000 || '',
          publish_date: r.a101 || '',
          implement_date: r.a205 || '',
          replaced_by: (['被代替', '作废', '废止'].includes(r.a000) ? currentMap.get(base) || '' : ''),
          publisher: '',
          category: '',
          ics: '',
          versions: versions.length > 1 ? versions : undefined,
        }
      })
    } catch (e: any) {
      add(`cssn error: ${e.message}`, 'error')
      return []
    }
  }

  return { query }
}
