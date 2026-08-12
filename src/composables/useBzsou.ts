import type { BzsouItem, BzsouResponse, StandardResult } from '../types'
import { useLogStore } from '../stores/log'
import { errMsg } from '../utils/errors'
import { matchStdNo } from '../utils/match'
import { normalizeKeyword, normalizeStdNo } from '../utils/normalize'
import { useProxy } from './useProxy'

const BZSOU_API = 'https://www.bzsou.cn/ibmb/solrData/search.do'

export function useBzsou() {
  const { race, fetchDirect } = useProxy()
  const { add } = useLogStore()

  function mapStatus(status: string): string {
    if (status === '部分废止')
      return '现行'
    return status
  }

  function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&mdash;/g, '—').replace(/&nbsp;/g, ' ')
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
        add(`bzsou: direct failed, trying proxy`, 'warn')
        resp = await race(url)
      }

      if (!resp) {
        add(`bzsou: all methods failed`, 'error')
        return []
      }

      const data = JSON.parse(resp) as BzsouResponse
      const totalCount = data.totalCount || 0
      add(`bzsou response: ${totalCount} results, ${Date.now() - t0}ms`, 'info')

      const results = data.result || []
      if (!Array.isArray(results) || results.length === 0)
        return []

      // Filter by standard number match
      const queryNorm = normalizeStdNo(normalized)
      const filtered = results.filter((r: BzsouItem) => {
        const stdNorm = normalizeStdNo(r.STAN_NUM || '')
        return matchStdNo(queryNorm, stdNorm)
      })

      add(`bzsou: ${filtered.length}/${totalCount} matched`, 'info')

      return filtered.map((r: BzsouItem) => ({
        query: keyword,
        standard_number: stripHtml(r.STAN_NUM || ''),
        title: stripHtml(r.STAN_CNNAME || ''),
        status: mapStatus(r.STAN_STATUS || ''),
        publish_date: r.PUB_DATE ? new Date(r.PUB_DATE).toISOString().split('T')[0] : (r.STAN_PART_YEAR ? String(r.STAN_PART_YEAR) : ''),
        implement_date: r.IMPL_DATE ? new Date(r.IMPL_DATE).toISOString().split('T')[0] : '',
        replaced_by: '',
        publisher: r.RELEASE_ORG || '',
        category: r.CCS_NAME || '',
        ics: r.ICS_NAME || '',
      }))
    }
    catch (e) {
      add(`bzsou error: ${errMsg(e)}`, 'error')
      return []
    }
  }

  return { query }
}
