import type { StandardResult } from '../types'
import { normalizeKeyword, normalizeStdNo } from '../utils/normalize'
import { useProxy } from './useProxy'
import { useLog } from './useLog'

const BZSOU_API = 'https://www.bzsou.cn/ibmb/solrData/search.do'

export function useBzsou() {
  const { race, fetchDirect } = useProxy()
  const { add } = useLog()

  function mapStatus(status: string): string {
    if (status === '部分废止') return '现行'
    return status
  }

  function matchStdNo(queryNorm: string, stdNorm: string): boolean {
    // Exact match
    if (queryNorm === stdNorm) return true
    // Query contained in standard number
    if (stdNorm.includes(queryNorm)) return true
    // Standard number contained in query
    if (queryNorm.includes(stdNorm)) return true
    // Match by prefix + number (e.g., GB50222 matches GB 50222-2017)
    const qPrefix = (queryNorm.match(/^[a-z\/]+/i) || [''])[0]
    const sPrefix = (stdNorm.match(/^[a-z\/]+/i) || [''])[0]
    const qNum = queryNorm.replace(/^[a-z\/]+/i, '')
    const sNum = stdNorm.replace(/^[a-z\/]+/i, '')
    if (qNum && sNum && qNum === sNum && qPrefix.slice(0, 2) === sPrefix.slice(0, 2)) return true
    return false
  }

  async function query(keyword: string): Promise<StandardResult[]> {
    const normalized = normalizeKeyword(keyword)
    const params = new URLSearchParams({
      searchString: normalized,
      isTilu: 'true',
      order: '0',
      isDesc: '0',
      filterSortValue: '',
      isContent: 'true',
      isActiveState: 'false',
      isAbolishState: 'false',
      isUnCarryState: 'false',
      isNation: 'false',
      isCountry: 'false',
      isForeign: 'false',
      isPartAbolishState: 'false',
      isLocal: 'false',
      isIndustry: 'false',
      isOther: 'false',
      isEnterprise: 'false',
      isAdviseState: 'false',
      isGroup: 'false',
      isInternational: 'false',
      isForceState: 'false',
      isGuideState: 'false',
    })

    const url = `${BZSOU_API}?${params.toString()}`

    try {
      add(`bzsou: "${normalized}"`, 'info')
      const t0 = Date.now()

      // bzsou.cn supports CORS, try direct fetch first
      let resp: string | null = null
      try {
        resp = await fetchDirect(url)
        if (resp && resp.startsWith('{')) {
          add(`bzsou: direct fetch OK`, 'info')
        } else {
          resp = null
        }
      } catch {
        resp = null
      }

      // Fall back to proxy if direct fails
      if (!resp) {
        add(`bzsou: direct failed, trying proxy`, 'warn')
        resp = await race(url)
      }

      if (!resp) {
        add(`bzsou: all methods failed`, 'error')
        return []
      }

      const data = JSON.parse(resp)
      const totalCount = data.totalCount || 0
      add(`bzsou response: ${totalCount} results, ${Date.now() - t0}ms`, 'info')

      const results = data.result || []
      if (!Array.isArray(results) || results.length === 0) return []

      // Filter by standard number match
      const queryNorm = normalizeStdNo(normalized)
      const filtered = results.filter((r: any) => {
        const stdNorm = normalizeStdNo(r.STAN_NUM || '')
        return matchStdNo(queryNorm, stdNorm)
      })

      add(`bzsou: ${filtered.length}/${totalCount} matched`, 'info')

      return filtered.map((r: any) => ({
        query: keyword,
        standard_number: r.STAN_NUM || '',
        title: r.STAN_CNNAME || '',
        status: mapStatus(r.STAN_STATUS || ''),
        publish_date: r.PUB_DATE ? new Date(r.PUB_DATE).toISOString().split('T')[0] : (r.STAN_PART_YEAR ? String(r.STAN_PART_YEAR) : ''),
        implement_date: r.IMPL_DATE ? new Date(r.IMPL_DATE).toISOString().split('T')[0] : '',
        replaced_by: '',
        publisher: r.RELEASE_ORG || '',
        category: r.CCS_NAME || '',
        ics: r.ICS_NAME || '',
      }))
    } catch (e: any) {
      add(`bzsou error: ${e.message}`, 'error')
      return []
    }
  }

  return { query }
}
