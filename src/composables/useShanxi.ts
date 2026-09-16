import type { StandardResult } from '../types'
import { useLogStore } from '../stores/log'
import { errMsg } from '../utils/errors'
import { parseShanxiAnnouncementHtml, parseShanxiEntryPdfHtml } from '../utils/htmlParser'
import { matchStdNo } from '../utils/match'
import { normalizeKeyword, normalizeStdNo } from '../utils/normalize'
import { STATUS } from '../utils/status'
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

// 名称检索时最多解析几个标准库条目页(该页无编号,只为取 PDF 外链)
const MAX_ENTRIES = 3

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

  // position=0 全文检索(编号检索必须用它,标题检索对编号 total=0);
  // position=1 标题检索(名称检索用它,否则全文命中太多噪声)。
  async function searchDocs(keyword: string, position = '0'): Promise<ShanxiSearchItem[]> {
    const params = new URLSearchParams({
      keywords: keyword,
      pageNum: '1',
      siteId: SHANXI_SITE_ID,
      position,
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

  // ===== 名称检索 =====
  // 实测:标题检索(position=1)对名称关键词可用(与编号检索相反,编号必须用 position=0)。
  // 结果里混着「标准库条目」「发布公告」「征求意见稿」「转发通知」,
  // 标准名称本身只在标准库条目页标题里(如《城市综合管廊工程技术标准》),故按标题过滤。
  // 该页无标准编号,只能靠「抓发布公告正文 → 用标准名称匹配」补全编号/实施日期/替代关系。
  const ENTRY_TITLE_RE = /^《.+》$/

  // 标题可能带书名号、空格或「的公告」等后缀,统一成纯名称再比对
  function normalizeTitle(s: string): string {
    return stripTags(s)
      .replace(/[《》\s]/g, '')
      .replace(/^.*?关于(?:批准)?发布/, '')
      .replace(/的公告.*$/, '')
      .trim()
  }

  async function queryByName(keyword: string): Promise<StandardResult[]> {
    const kw = normalizeKeyword(keyword)

    try {
      add(`shanxi (name): "${kw}"`, 'info')
      const t0 = Date.now()

      const hits = await searchDocs(kw, '1')
      if (hits.length === 0)
        return []

      // 标准库条目页:标题即标准名称(实测 20/20 条目页均带 PDF 附件)
      const entries = hits
        .filter(h => h.docpuburl && h.docpuburl.includes('/bzk/') && ENTRY_TITLE_RE.test(stripTags(h.gk_doctitle || h.title || '')))
        .slice(0, MAX_ENTRIES)
      if (entries.length === 0) {
        add(`shanxi (name): ${hits.length} hits 但无标准库条目页`, 'warn')
        return []
      }

      // 发布公告:正文含编号/实施日期/替代关系,用它给条目补全字段。
      // 不按固定条数截断,而是「按名称给每个条目找它自己的公告」——否则名称检索命中
      // 多个标准时,靠后的条目会因公告被截断而拿不到编号(实测 2023 年的公告就是这样丢的)。
      const announcementCandidates = hits
        .filter(h => h.docpuburl && ANNOUNCEMENT_TITLE_RE.test(stripTags(h.gk_doctitle || h.title || '')))
        .sort((a, b) => (b.docpubtime || '').localeCompare(a.docpubtime || ''))

      const entryTitles = entries.map(e => stripTags(e.gk_doctitle || e.title || '').replace(/[《》]/g, '').trim())

      // 每个条目挑最新的一份同名公告(最新的公告才反映当前状态)
      const annForEntry: Array<ShanxiSearchItem | undefined> = entryTitles.map((t) => {
        const key = normalizeTitle(t)
        return announcementCandidates.find(a => normalizeTitle(a.gk_doctitle || a.title || '') === key)
      })

      const entryPages = await Promise.allSettled(entries.map(h => race(h.docpuburl!)))

      const byTitle = new Map<string, StandardResult[]>()
      await Promise.all(annForEntry.map(async (ann) => {
        if (!ann?.docpuburl || byTitle.has(normalizeTitle(ann.gk_doctitle || ann.title || '')))
          return
        const html = await race(ann.docpuburl)
        if (!html)
          return
        const rows = parseShanxiAnnouncementHtml(html, {
          keyword,
          pubDate: (ann.docpubtime || '').slice(0, 10),
        })
        if (rows.length === 0)
          return
        const key = normalizeTitle(rows[0].title)
        if (key)
          byTitle.set(key, rows)
      }))

      const results: StandardResult[] = []
      entries.forEach((entry, idx) => {
        const title = entryTitles[idx]
        if (!title)
          return

        // 用标准名称回匹配公告(编号在公告正文里,条目页没有)
        const matched = byTitle.get(normalizeTitle(title)) || []
        const base: StandardResult = matched[0]
          ? { ...matched[0], title }
          : {
              query: keyword,
              standard_number: '',
              title,
              status: STATUS.ACTIVE,
              publish_date: (entry.docpubtime || '').slice(0, 10),
              implement_date: '',
              replaced_by: '',
              publisher: '山西省住房和城乡建设厅',
              category: '地方标准',
              ics: '',
            }

        // PDF 附件只在条目页,挂在同一行上(68MB,只做外链)
        const page = entryPages[idx]
        if (page.status === 'fulfilled' && page.value) {
          const pdf = parseShanxiEntryPdfHtml(page.value, entry.docpuburl!)
          if (pdf)
            base.pdf_url = pdf
        }

        if (!results.some(x => x.title === base.title && x.standard_number === base.standard_number))
          results.push(base)

        // 被该公告废止的旧标准一并带出,查新场景常问「旧编号被谁替代」
        for (const old of matched.slice(1)) {
          if (!results.some(x => x.standard_number === old.standard_number))
            results.push({ ...old, title: old.title })
        }
      })

      const withNo = results.filter(r => !r.standard_number).length
      if (withNo > 0)
        add(`shanxi (name): ${withNo} 条未匹配到发布公告,编号留空`, 'warn')

      add(`shanxi (name): ${results.length} matched (${Date.now() - t0}ms)`, results.length > 0 ? 'success' : 'warn')
      return results
    }
    catch (e) {
      add(`shanxi (name) error: ${errMsg(e)}`, 'error')
      return []
    }
  }

  return { query, queryByName }
}
