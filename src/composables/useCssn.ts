import type { StandardResult, StandardVersion } from '../types'
import { normalizeKeyword, normalizeStdNo, stdBase } from '../utils/normalize'
import { useProxy } from './useProxy'
import { useLog } from './useLog'

const CSSN_URL = 'https://www.cssn.net.cn/api/standards/'

export function useCssn() {
  const { race, fetchDirect } = useProxy()
  const { add } = useLog()

  async function fetchRaw(keyword: string, page?: number): Promise<{ results: any[], next: string | null }> {
    const normalized = normalizeKeyword(keyword)
    let url = `${CSSN_URL}?keyword=${encodeURIComponent(normalized)}`
    if (page && page > 1) {
      url += `&page=${page}`
    }

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

    if (!resp) return { results: [], next: null }

    const data = JSON.parse(resp)
    return { results: data.results || [], next: data.next || null }
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
      .filter((r) => !isEnglishVersion(r))
      .map((r) => ({
        standard_number: r.a100 || '',
        title: r.a298 || '',
        status: mapStatus(r.a000 || ''),
        publish_date: r.a101 || '',
        implement_date: r.a205 || '',
      }))
      .sort((a, b) => b.standard_number.localeCompare(a.standard_number))
  }

  function mapStatus(s: string): string {
    if (s === '未生效') return '即将实施'
    if (s === '历史' || s === '作废') return '废止'
    return s
  }

  function isEnglishVersion(r: any): boolean {
    return /\(英文版\)|\(英文\)/.test(r.a100 || '') || /\(英文版\)|\(英文\)/.test(r.a298 || '')
  }

  async function query(keyword: string): Promise<StandardResult[]> {
    const normalized = normalizeKeyword(keyword)

    try {
      add(`cssn: "${normalized}"`, 'info')
      const t0 = Date.now()

      const { results: allResults } = await fetchRaw(normalized)
      add(`cssn response: ${allResults.length} results, ${Date.now() - t0}ms`, 'info')

      if (allResults.length === 0) return []

      // Filter out English versions and empty status
      const filtered = filterResults(allResults, normalized)
        .filter((r) => !isEnglishVersion(r))
        .filter((r) => r.a000)
      if (filtered.length === 0) return []

      // Group by base to find versions
      const groups = groupByBase(allResults.filter((r) => !isEnglishVersion(r)))
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
          status: mapStatus(r.a000 || ''),
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

  function prefixPriority(stdNo: string): number {
    const upper = stdNo.toUpperCase()
    // Tier 0: 国标
    if (/^GB[\/\sTZ]|^GB$/.test(upper)) return 0
    // Tier 1: 建筑工程类
    if (/^(JGJ|CJJ|CECS|GBJ)/.test(upper)) return 1
    // Tier 2: 其他行业标准
    if (/^(CJ|DL|SL|SY|JTG|JTJ|TB|YB|HG|SH|NB|NY|LY|SC|QB|GY|YD|MH|CB|QJ|EJ|HB|SJ|GA|GM)/.test(upper)) return 2
    // Tier 3: 地方标准
    if (/^DB/.test(upper)) return 3
    // Tier 4: 国际/国外标准
    if (/^(ISO|IEC|ASTM|EN|DIN|BS|JIS|NF|ASME|IEEE|ANSI|SAE|UL|CSA)/.test(upper)) return 4
    // Tier 5: 其他
    return 5
  }

  async function queryByName(keyword: string): Promise<StandardResult[]> {
    const normalized = normalizeKeyword(keyword)

    try {
      add(`cssn (name): "${normalized}"`, 'info')
      const t0 = Date.now()

      // Fetch up to 3 pages
      let allResults: any[] = []
      for (let page = 1; page <= 3; page++) {
        const { results, next } = await fetchRaw(normalized, page)
        allResults = allResults.concat(results)
        add(`cssn page ${page}: ${results.length} results`, 'info')
        if (!next || results.length === 0) break
      }
      add(`cssn total: ${allResults.length} results, ${Date.now() - t0}ms`, 'info')

      if (allResults.length === 0) return []

      // Filter out English versions and empty status
      const filtered = allResults
        .filter((r) => !isEnglishVersion(r))
        .filter((r) => r.a000)

      // Group by base to find versions
      const groups = groupByBase(filtered)

      const mapped = filtered.map((r: any) => {
        const base = stdBase(r.a100 || '')
        const versions = base ? toVersions(groups.get(base) || []) : []

        return {
          query: keyword,
          standard_number: r.a100 || '',
          title: r.a298 || '',
          status: mapStatus(r.a000 || ''),
          publish_date: r.a101 || '',
          implement_date: r.a205 || '',
          replaced_by: '',
          publisher: '',
          category: '',
          ics: '',
          versions: versions.length > 1 ? versions : undefined,
        }
      })

      // Sort: preferred standard prefixes first, then by original order
      return mapped.sort((a, b) => {
        const pa = prefixPriority(a.standard_number)
        const pb = prefixPriority(b.standard_number)
        if (pa !== pb) return pa - pb
        return 0 // stable sort, preserve API order
      })
    } catch (e: any) {
      add(`cssn error: ${e.message}`, 'error')
      return []
    }
  }

  return { query, queryByName }
}
