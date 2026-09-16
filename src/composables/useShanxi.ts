import type { StandardResult } from '../types'
import { useLogStore } from '../stores/log'
import { errMsg } from '../utils/errors'
import { parseShanxiAnnouncementHtml } from '../utils/htmlParser'
import { matchStdNo } from '../utils/match'
import { normalizeKeyword, normalizeStdNo } from '../utils/normalize'
import { useProxy } from './useProxy'

// 站内 TRS 检索接口(目录页 AJAX 同款)。siteId=13 为该站政府信息公开检索库 id。
const SHANXI_SEARCH_API = 'https://zjt.shanxi.gov.cn/trs-search/trssearch/openSearch/getZwgkList'
const SHANXI_SITE_ID = '13'

// 该站「空结果」响应实测仅 84 字节,低于 race 默认 200 字节下限会被误判为无效代理响应,
// 故单独放宽 JSON 下限;WAF 挑战页仍被「首字符必须是 {」这条挡掉。
const SHANXI_MIN_JSON_BYTES = 40

// 单次查询最多解析几条公告详情页。同一编号通常命中「发布公告 + 标准库条目」,
// 取 2 条即可,避免放大站点压力。
const MAX_ANNOUNCEMENTS = 2

// 公告标题特征(实测公告栏目 20/20 条一致)。检索库同时收录标准库条目、征求意见稿等,
// 只有「发布公告」正文含标准编号,故按标题过滤。
const ANNOUNCEMENT_TITLE_RE = /关于(?:批准)?发布/

interface ShanxiSearchItem {
  docpuburl?: string
  gk_doctitle?: string
  title?: string
  docpubtime?: string
}

interface ShanxiSearchResponse {
  state?: number
  data?: { total?: number, data?: ShanxiSearchItem[] }
}

// 检索结果标题带 <em style='color:red'> 高亮,过滤/展示前需去标签
function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, '')
}

export function useShanxi() {
  // 实测该站无 CORS,目录页与检索接口均无 ACAO 头 → 只能走代理,不做直连尝试
  const { race } = useProxy()
  const { add } = useLogStore()

  // position=0 全文检索:编号只出现在公告正文里,标题检索命不中(实测 total=0)
  async function searchDocs(keyword: string): Promise<ShanxiSearchItem[]> {
    const params = new URLSearchParams({
      keywords: keyword,
      pageNum: '1',
      siteId: SHANXI_SITE_ID,
      position: '0',
      sort: '',
      suitability: '1',
    })
    const resp = await race(`${SHANXI_SEARCH_API}?${params.toString()}`, 'json', SHANXI_MIN_JSON_BYTES)
    if (!resp)
      return []
    try {
      const data = JSON.parse(resp) as ShanxiSearchResponse
      return data.data?.data || []
    }
    catch {
      return []
    }
  }

  // 该站全文检索对空格敏感,生成候选词依次尝试(参考 useCcsn.searchCandidates 的做法)
  function searchCandidates(normalized: string): string[] {
    const compact = normalized.replace(/\s+/g, '')
    const slashFixed = compact.replace(/^([A-Z]{2,}\d*)T(\d)/i, '$1/T$2')
    return [...new Set([compact, slashFixed])].filter(Boolean)
  }

  // 站点编号一律写作 DBJ04/T389-2026;用户可能输入 DBJ04T389-2026 或 DBJ04 T389-2026,
  // 若直接拿原始词去 matchStdNo 会因缺斜杠而全部漏判,故先补回斜杠再归一化。
  function canonicalStdNo(normalized: string): string {
    const compact = normalized.replace(/\s+/g, '')
    return normalizeStdNo(compact.replace(/^([A-Z]{2,}\d*)T(\d)/i, '$1/T$2'))
  }

  async function query(keyword: string): Promise<StandardResult[]> {
    const normalized = normalizeKeyword(keyword)

    try {
      add(`shanxi: "${normalized}"`, 'info')
      const t0 = Date.now()

      let hits: ShanxiSearchItem[] = []
      for (const candidate of searchCandidates(normalized)) {
        hits = await searchDocs(candidate)
        add(`shanxi(s="${candidate}"): ${hits.length} hits`, 'info')
        if (hits.length > 0)
          break
      }
      if (hits.length === 0)
        return []

      // 检索库同时收录「标准库条目」「征求意见稿」等,只有发布公告正文含编号,按标题过滤。
      // 按发布时间倒序:同一编号可能有多份公告(旧版发布公告 + 新版废止公告),
      // 新的先解析并优先占位,才能得到「已废止 / 被谁替代」的正确结论。
      const announcements = hits
        .filter(h => h.docpuburl && ANNOUNCEMENT_TITLE_RE.test(stripTags(h.gk_doctitle || h.title || '')))
        .sort((a, b) => (b.docpubtime || '').localeCompare(a.docpubtime || ''))
        .slice(0, MAX_ANNOUNCEMENTS)
      if (announcements.length === 0) {
        add(`shanxi: ${hits.length} hits 但无「发布公告」(仅标准库条目/征求意见稿)`, 'warn')
        return []
      }

      const pages = await Promise.allSettled(
        announcements.map(h => race(h.docpuburl!)),
      )

      const queryNorm = canonicalStdNo(normalized)
      const results: StandardResult[] = []
      let parsed = 0

      pages.forEach((r, idx) => {
        if (r.status !== 'fulfilled' || !r.value)
          return
        const rows = parseShanxiAnnouncementHtml(r.value, {
          keyword,
          pubDate: (announcements[idx].docpubtime || '').slice(0, 10),
        })
        parsed += rows.length
        // 站点是全文检索,必须回校验编号,避免同族标准误命中。
        // 无年份输入(如 DBJ04/T389)会同时匹配新旧两行,正好覆盖查版本的需求。
        for (const row of rows) {
          if (matchStdNo(queryNorm, normalizeStdNo(row.standard_number)) && !results.some(x => x.standard_number === row.standard_number))
            results.push(row)
        }
      })

      // 站点改模板导致正则失效时打 warn,而不是静默返回空(便于快速发现)
      if (parsed === 0)
        add(`shanxi: ${announcements.length} 份公告正文未匹配到「现批准…编号为」句式`, 'warn')

      add(`shanxi: ${results.length} matched (${Date.now() - t0}ms)`, results.length > 0 ? 'success' : 'warn')
      return results
    }
    catch (e) {
      add(`shanxi error: ${errMsg(e)}`, 'error')
      return []
    }
  }

  return { query }
}
