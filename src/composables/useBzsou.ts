import type { StandardResult } from '../types'
import { normalizeKeyword } from '../utils/normalize'
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
      add(`bzsou response: ${data.totalCount || 0} results, ${Date.now() - t0}ms`, 'info')

      const results = data.results || []
      if (!Array.isArray(results) || results.length === 0) return []

      return results.map((r: any) => ({
        query: keyword,
        standard_number: r.STAN_NUM || '',
        title: r.STAN_CNNAME || '',
        status: mapStatus(r.STAN_STATUS || ''),
        publish_date: r.STAN_PART_YEAR ? String(r.STAN_PART_YEAR) : '',
        implement_date: '',
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
