import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useShanxi } from '../useShanxi'

const raceMock = vi.fn()

vi.mock('../../stores/log', () => ({
  useLogStore: () => ({ add: vi.fn() }),
}))

vi.mock('../useProxy', () => ({
  useProxy: () => ({ race: raceMock }),
}))

function searchResponse(items: Array<Record<string, string>>): string {
  return JSON.stringify({ msg: 'success', state: 200, data: { total: items.length, data: items, pageSize: 10, pageNum: 1 } })
}

function announcementPage(body: string): string {
  return `<div class="trs_editor_view TRS_UEDITOR"><p><span style="font-size:16px;">${body}</span></p></div>`
}

const ANNOUNCEMENT_2026 = announcementPage(
  '现批准《城市综合管廊工程技术标准》为山西省工程建设地方标准，编号为DBJ04/T389-2026，自2026年9月1日起实施。'
  + '原《城市综合管廊工程技术标准》（DBJ04/T389-2019）同时废止。',
)
const ANNOUNCEMENT_2019 = announcementPage(
  '现批准《城市综合管廊工程技术标准》为山西省工程建设地方标准，编号为DBJ04/T389-2019，自2020年1月1日起实施。',
)

// 实测返回:公告标题带 <em> 高亮;docpuburl 为 http://;docpubtime 为 'YYYY-MM-DD HH:mm:ss'
function hit(overrides: Record<string, string> = {}) {
  return {
    gk_doctitle: '山西省住房和城乡建设厅关于发布《城市综合管廊工程技术标准》的公告',
    docpuburl: 'http://zjt.shanxi.gov.cn/zfxxgk/zfxxgkml/bzgf/bzgg/202606/t20260611_10144446.shtml',
    docpubtime: '2026-06-11 15:04:39',
    ...overrides,
  }
}

describe('useShanxi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries the TRS openSearch API with position=0 (全文检索)', async () => {
    raceMock.mockResolvedValueOnce(searchResponse([hit()]))
    raceMock.mockResolvedValueOnce(ANNOUNCEMENT_2026)

    const { query } = useShanxi()
    await query('DBJ04/T389-2026')

    const url = raceMock.mock.calls[0][0] as string
    expect(url).toContain('https://zjt.shanxi.gov.cn/trs-search/trssearch/openSearch/getZwgkList?')
    expect(url).toContain('keywords=DBJ04%2FT389-2026')
    expect(url).toContain('position=0')
    expect(url).toContain('siteId=13')
    // JSON 源:放宽空结果响应体下限(实测 84 字节)
    expect(raceMock.mock.calls[0][1]).toBe('json')
    expect(raceMock.mock.calls[0][2]).toBe(40)
  })

  it('parses the announcement page and returns new + replaced old standard', async () => {
    raceMock.mockResolvedValueOnce(searchResponse([hit()]))
    raceMock.mockResolvedValueOnce(ANNOUNCEMENT_2026)

    const { query } = useShanxi()
    const results = await query('DBJ04/T389')

    // 无年份输入同时命中新旧两行,正好覆盖「查版本」需求
    expect(results).toHaveLength(2)
    expect(results[0].standard_number).toBe('DBJ04/T389-2026')
    expect(results[0].status).toBe('现行')
    expect(results[0].publish_date).toBe('2026-06-11')
    expect(results[1].standard_number).toBe('DBJ04/T389-2019')
    expect(results[1].status).toBe('废止')
    expect(results[1].replaced_by).toBe('DBJ04/T389-2026')
  })

  it('回校验编号:过滤同族其他年份的标准', async () => {
    raceMock.mockResolvedValueOnce(searchResponse([hit()]))
    raceMock.mockResolvedValueOnce(ANNOUNCEMENT_2026)

    const { query } = useShanxi()
    const results = await query('DBJ04/T389-2019')

    expect(results).toHaveLength(1)
    expect(results[0].standard_number).toBe('DBJ04/T389-2019')
    expect(results[0].status).toBe('废止')
    expect(results[0].replaced_by).toBe('DBJ04/T389-2026')
  })

  it('returns empty when the search has no hits', async () => {
    raceMock.mockResolvedValueOnce(searchResponse([]))

    const { query } = useShanxi()
    expect(await query('DBJ04/T999-2026')).toEqual([])
    // 0 命中无需抓详情页
    expect(raceMock).toHaveBeenCalledTimes(1)
  })

  it('ignores hits whose title is not a 发布公告 (标准库条目/征求意见稿)', async () => {
    raceMock.mockResolvedValueOnce(searchResponse([
      hit({ gk_doctitle: '《城市综合管廊工程技术标准》', docpuburl: 'http://zjt.shanxi.gov.cn/zfxxgk/zfxxgkml/bzgf/bzk/202606/t20260612_10145310.shtml' }),
      hit({ gk_doctitle: '山西省住房和城乡建设厅关于《城市综合管廊工程技术标准》公开征求意见的通知' }),
    ]))

    const { query } = useShanxi()
    expect(await query('DBJ04/T389-2026')).toEqual([])
    // 只发了检索请求,没有抓详情页
    expect(raceMock).toHaveBeenCalledTimes(1)
  })

  it('still matches when the keyword highlight <em> splits the 关于发布 title', async () => {
    raceMock.mockResolvedValueOnce(searchResponse([
      hit({ gk_doctitle: '山西省住房和城乡建设厅关于<em style=\'color:red\'>发布</em>《城市综合管廊工程技术标准》的公告' }),
    ]))
    raceMock.mockResolvedValueOnce(ANNOUNCEMENT_2026)

    const { query } = useShanxi()
    const results = await query('DBJ04/T389-2026')

    expect(results).toHaveLength(1)
    expect(results[0].standard_number).toBe('DBJ04/T389-2026')
  })

  it('prefers the newest announcement when several describe the same number', async () => {
    // 旧公告在前、新公告在后,按 docpubtime 倒序后应先用新公告解析
    raceMock.mockResolvedValueOnce(searchResponse([
      hit({ docpubtime: '2019-10-16 15:05:00', docpuburl: 'http://zjt.shanxi.gov.cn/zfxxgk/zfxxgkml/bzgf/bzgg/202505/t20250509_9831053.shtml' }),
      hit(),
    ]))
    raceMock.mockResolvedValueOnce(ANNOUNCEMENT_2026)
    raceMock.mockResolvedValueOnce(ANNOUNCEMENT_2019)

    const { query } = useShanxi()
    const results = await query('DBJ04/T389-2019')

    // 新公告已把该编号判为「废止,被 DBJ04/T389-2026 替代」,旧公告的「现行」不得覆盖它
    expect(results).toHaveLength(1)
    expect(results[0].status).toBe('废止')
    expect(results[0].replaced_by).toBe('DBJ04/T389-2026')
    // 新公告排在第一顺位被优先抓取
    expect(raceMock.mock.calls[1][0]).toContain('t20260611_10144446')
  })

  it('returns empty when all proxies fail on the search request', async () => {
    raceMock.mockResolvedValueOnce(null)

    const { query } = useShanxi()
    expect(await query('DBJ04/T389-2026')).toEqual([])
  })

  it('returns empty when the announcement page cannot be fetched', async () => {
    raceMock.mockResolvedValueOnce(searchResponse([hit()]))
    raceMock.mockResolvedValueOnce(null)

    const { query } = useShanxi()
    expect(await query('DBJ04/T389-2026')).toEqual([])
  })

  it('returns empty when the search response is not JSON', async () => {
    raceMock.mockResolvedValueOnce('<html>WAF</html>')

    const { query } = useShanxi()
    expect(await query('DBJ04/T389-2026')).toEqual([])
  })

  it('returns empty when race throws', async () => {
    raceMock.mockRejectedValueOnce(new Error('network error'))

    const { query } = useShanxi()
    expect(await query('DBJ04/T389-2026')).toEqual([])
  })

  it('retries with a slash-repaired candidate when the first returns nothing', async () => {
    raceMock.mockResolvedValueOnce(searchResponse([]))
    raceMock.mockResolvedValueOnce(searchResponse([hit()]))
    raceMock.mockResolvedValueOnce(ANNOUNCEMENT_2026)

    const { query } = useShanxi()
    const results = await query('DBJ04 T389-2026')

    // 第一个候选词去掉空格:DBJ04T389-2026;第二个补回斜杠:DBJ04/T389-2026
    expect(raceMock.mock.calls[0][0]).toContain('keywords=DBJ04T389-2026')
    expect(raceMock.mock.calls[1][0]).toContain('keywords=DBJ04%2FT389-2026')
    // 带年份输入只应命中该年份,且缺斜杠的写法必须能通过编号回校验
    expect(results).toHaveLength(1)
    expect(results[0].standard_number).toBe('DBJ04/T389-2026')
  })

  it('回校验对缺斜杠的输入同样有效', async () => {
    raceMock.mockResolvedValueOnce(searchResponse([hit()]))
    raceMock.mockResolvedValueOnce(ANNOUNCEMENT_2026)

    const { query } = useShanxi()
    const results = await query('DBJ04T389')

    expect(results).toHaveLength(2)
    expect(results[0].standard_number).toBe('DBJ04/T389-2026')
    expect(results[1].standard_number).toBe('DBJ04/T389-2019')
  })
})
