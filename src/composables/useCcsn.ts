import type { CcsnItem, CcsnResponse, StandardResult } from '../types'
import { useLogStore } from '../stores/log'
import { errMsg } from '../utils/errors'
import { matchStdNo } from '../utils/match'
import { normalizeKeyword, normalizeStdNo, stdBase } from '../utils/normalize'
import { useProxy } from './useProxy'

const CCSN_URL = 'https://www.ccsn.org.cn/newweb/api/StandardQuery.assx/queryStandard'

export function useCcsn() {
  const { race, fetchDirect } = useProxy()
  const { add } = useLogStore()

  async function fetchRaw(keyword: string): Promise<CcsnItem[]> {
    const params = new URLSearchParams({
      gjz: keyword,
      pageIndex: '1',
      pageSize: '20',
    })
    const url = `${CCSN_URL}?${params.toString()}`

    // ccsn.org.cn 支持 CORS 预检，尝试直连
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
      return []

    try {
      const data = JSON.parse(resp) as CcsnResponse
      return data.List || []
    }
    catch {
      return []
    }
  }

  // 该站搜索为全文分词:带空格/带 GB 前缀常无结果,生成候选词依次尝试
  function searchCandidates(normalized: string): string[] {
    const noSpace = normalized.replace(/\s+/g, '')
    const stripped = noSpace.replace(/^[a-z/]+/i, '') // GB50010-2010 -> 50010-2010
    const candidates = [noSpace, stripped]
    if (noSpace !== stripped)
      candidates.push(stdBase(stripped)) // 兜底:纯编号无年份
    return [...new Set(candidates)]
  }

  function filterResults(items: CcsnItem[], normalized: string): CcsnItem[] {
    const queryNorm = normalizeStdNo(normalized)
    return items.filter((r) => {
      const stdNorm = normalizeStdNo(normalizeKeyword(r.StandardCode || ''))
      return matchStdNo(queryNorm, stdNorm)
    })
  }

  function mapToResult(r: CcsnItem, keyword: string): StandardResult {
    const abolished = Boolean(r.AbolishDate)
    return {
      query: keyword,
      standard_number: r.StandardCode || '',
      title: r.StandardCNName || '',
      status: abolished ? '废止' : (r.StandardState || ''),
      publish_date: (r.PublishDate || '').slice(0, 10),
      implement_date: (r.PerformDate || '').slice(0, 10),
      replaced_by: r.ReplaceStandardCode || '',
      publisher: r.ApprovalDep || '',
      category: '',
      ics: '',
      versions: undefined,
    }
  }

  async function query(keyword: string): Promise<StandardResult[]> {
    const normalized = normalizeKeyword(keyword)

    try {
      add(`ccsn: "${normalized}"`, 'info')
      const t0 = Date.now()

      for (const candidate of searchCandidates(normalized)) {
        const raw = await fetchRaw(candidate)
        add(`ccsn(s="${candidate}"): ${raw.length} results, ${Date.now() - t0}ms`, 'info')
        if (raw.length === 0)
          continue

        const filtered = filterResults(raw, normalized)
        if (filtered.length === 0)
          continue

        return filtered.map(r => mapToResult(r, keyword))
      }
      return []
    }
    catch (e) {
      add(`ccsn error: ${errMsg(e)}`, 'error')
      return []
    }
  }

  return { query }
}
