import type { CssnItem, CssnResponse, StandardResult, StandardVersion } from '../types'
import { useLogStore } from '../stores/log'
import { errMsg } from '../utils/errors'
import { matchStdNo } from '../utils/match'
import { normalizeKeyword, normalizeStdNo, stdBase } from '../utils/normalize'
import { useProxy } from './useProxy'

const CSSN_URL = 'https://www.cssn.net.cn/api/standards/'

export function useCssn() {
  const { race, fetchDirect } = useProxy()
  const { add } = useLogStore()

  async function fetchRaw(keyword: string, page?: number): Promise<CssnResponse> {
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
      }
      else {
        resp = null
      }
    }
    catch {
      resp = null
    }

    // Fall back to proxy if direct fails
    if (!resp) {
      resp = await race(url)
    }

    if (!resp)
      return { results: [], next: null }

    const data = JSON.parse(resp)
    return { results: data.results || [], next: data.next || null }
  }

  function filterResults(allResults: CssnItem[], normalized: string): CssnItem[] {
    const queryNorm = normalizeStdNo(normalized)

    return allResults.filter((r) => {
      const stdNorm = normalizeStdNo(r.a100 || '')
      return matchStdNo(queryNorm, stdNorm)
    })
  }

  function groupByBase(results: CssnItem[]): Map<string, CssnItem[]> {
    const groups = new Map<string, CssnItem[]>()
    for (const r of results) {
      const base = stdBase(r.a100 || '')
      if (!base)
        continue
      if (!groups.has(base))
        groups.set(base, [])
      groups.get(base)!.push(r)
    }
    return groups
  }

  function toVersions(results: CssnItem[]): StandardVersion[] {
    return results
      .filter(r => !isEnglishVersion(r))
      .map(r => ({
        standard_number: r.a100 || '',
        title: r.a298 || '',
        status: mapStatus(r.a000 || ''),
        publish_date: r.a101 || '',
        implement_date: r.a205 || '',
      }))
      .sort((a, b) => b.standard_number.localeCompare(a.standard_number))
  }

  function mapStatus(s: string): string {
    if (s === '未生效')
      return '即将实施'
    if (s === '历史' || s === '作废' || s === '被代替')
      return '废止'
    return s
  }

  function isEnglishVersion(r: CssnItem): boolean {
    return /\(英文版\)|\(英文\)/.test(r.a100 || '') || /\(英文版\)|\(英文\)/.test(r.a298 || '')
  }

  function mapToResults(allResults: CssnItem[], keyword: string, opts?: { computeReplacedBy?: boolean, emit?: CssnItem[] }): StandardResult[] {
    // emit: 若指定则只输出这部分行（用于 query() 只输出 matchStdNo 匹配的行）
    // groups/currentMap 始终基于全量 allResults 构建，确保版本归组和替代标准推导正确
    const filtered = opts?.emit
      ? opts.emit.filter(r => !isEnglishVersion(r)).filter(r => r.a000)
      : allResults.filter(r => !isEnglishVersion(r)).filter(r => r.a000)

    const groups = groupByBase(allResults.filter(r => !isEnglishVersion(r)))

    let currentMap: Map<string, string> | null = null
    if (opts?.computeReplacedBy) {
      currentMap = new Map()
      allResults.forEach((r) => {
        if (r.a000 === '现行') {
          const base = stdBase(r.a100 || '')
          if (base)
            currentMap!.set(base, r.a100 || '')
        }
      })
    }

    return filtered.map((r) => {
      const base = stdBase(r.a100 || '')
      const versions = base ? toVersions(groups.get(base) || []) : []
      const replacedBy = currentMap && r.a000 && ['被代替', '作废', '废止'].includes(r.a000)
        ? currentMap.get(base) || ''
        : ''

      return {
        query: keyword,
        standard_number: r.a100 || '',
        title: r.a298 || '',
        status: mapStatus(r.a000 || ''),
        publish_date: r.a101 || '',
        implement_date: r.a205 || '',
        replaced_by: replacedBy,
        publisher: '',
        category: '',
        ics: '',
        versions: versions.length > 1 ? versions : undefined,
      }
    })
  }

  async function query(keyword: string): Promise<StandardResult[]> {
    const normalized = normalizeKeyword(keyword)

    try {
      add(`cssn: "${normalized}"`, 'info')
      const t0 = Date.now()

      const { results: allResults } = await fetchRaw(normalized)
      add(`cssn response: ${allResults.length} results, ${Date.now() - t0}ms`, 'info')

      if (allResults.length === 0)
        return []

      const filtered = filterResults(allResults, normalized)
      if (filtered.length === 0)
        return []

      // 传全量 allResults（构建版本归组 + currentMap），用 emit 限定只输出匹配行
      return mapToResults(allResults, keyword, { computeReplacedBy: true, emit: filtered })
    }
    catch (e) {
      add(`cssn error: ${errMsg(e)}`, 'error')
      return []
    }
  }

  function prefixPriority(stdNo: string): number {
    const upper = stdNo.toUpperCase()
    // Tier 0: 国标
    if (/^GB[/\sTZ]|^GB$/.test(upper))
      return 0
    // Tier 1: 建筑工程类
    if (/^(?:JGJ|CJJ|CECS|GBJ)/.test(upper))
      return 1
    // Tier 2: 其他行业标准
    if (/^(?:CJ|DL|SL|SY|JTG|JTJ|TB|YB|HG|SH|NB|NY|LY|SC|QB|GY|YD|MH|CB|QJ|EJ|HB|SJ|GA|GM)/.test(upper))
      return 2
    // Tier 3: 地方标准
    if (upper.startsWith('DB'))
      return 3
    // Tier 4: 国际/国外标准
    if (/^(?:ISO|IEC|ASTM|EN|DIN|BS|JIS|NF|ASME|IEEE|ANSI|SAE|UL|CSA)/.test(upper))
      return 4
    // Tier 5: 其他
    return 5
  }

  async function queryByName(keyword: string): Promise<StandardResult[]> {
    const normalized = normalizeKeyword(keyword)

    try {
      add(`cssn (name): "${normalized}"`, 'info')
      const t0 = Date.now()

      let allResults: CssnItem[] = []
      for (let page = 1; page <= 3; page++) {
        const { results, next } = await fetchRaw(normalized, page)
        allResults = allResults.concat(results)
        add(`cssn page ${page}: ${results.length} results`, 'info')
        if (!next || results.length === 0)
          break
      }
      add(`cssn total: ${allResults.length} results, ${Date.now() - t0}ms`, 'info')

      if (allResults.length === 0)
        return []

      const mapped = mapToResults(allResults, keyword)

      return mapped.sort((a, b) => {
        const pa = prefixPriority(a.standard_number)
        const pb = prefixPriority(b.standard_number)
        if (pa !== pb)
          return pa - pb
        return 0
      })
    }
    catch (e) {
      add(`cssn error: ${errMsg(e)}`, 'error')
      return []
    }
  }

  return { query, queryByName }
}
