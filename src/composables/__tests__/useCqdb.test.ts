import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCqdb } from '../useCqdb'

const raceMock = vi.fn()

vi.mock('../../stores/log', () => ({
  useLogStore: () => ({ add: vi.fn() }),
}))

vi.mock('../useProxy', () => ({
  useProxy: () => ({ race: raceMock }),
}))

// 影射真实页面结构:layui-table 为数据表,页面尾部另有一张无 class 的影子表格
// (打印版,复制同一批数据),解析器只应读取 layui-table
const cqdbPage = `
<table class="layui-table" lay-filter="parse-table-demo" lay-data="{id:'idTest',limit:10}">
  <tbody>
    <tr>
      <td>DBJ50/T-522⁃2025</td>
      <td>建筑分布式光伏电站消防技术标准</td>
      <td>2025-01-10</td>
      <td>2025-06-01</td>
      <td>现行</td>
      <td></td>
      <td></td>
      <td>某单位</td>
      <td>适用范围说明</td>
      <td>1 总则，2 术语</td>
      <td><a href="x_upfile/202501/abc.pdf">【下载】</a></td>
      <td><a href="javascript:;">意见反馈</a></td>
    </tr>
    <tr>
      <td>DBJ50/T-513-2025</td>
      <td>建设工程消防施工质量验收标准</td>
      <td>2025-02-20</td>
      <td>2025-07-01</td>
      <td>现行</td>
      <td></td>
      <td></td>
      <td>另一单位</td>
      <td>适用范围说明</td>
      <td>1 总则</td>
      <td><a href="x_upfile/202502/def.pdf">【下载】</a></td>
      <td><a href="javascript:;">意见反馈</a></td>
    </tr>
  </tbody>
</table>
<div class="page">共2条数据，第1/1页</div>
<table border="0" cellspacing="1" cellpadding="1">
  <tr>
    <td>DBJ50/T-522⁃2025</td>
    <td>建筑分布式光伏电站消防技术标准</td>
    <td>2025-01-10</td>
    <td>2025-06-01</td>
    <td>现行</td>
    <td></td>
    <td></td>
    <td>某单位</td>
    <td>适用范围说明</td>
    <td>1 总则，2 术语</td>
    <td>【下载】</td>
    <td>意见反馈</td>
  </tr>
  <tr>
    <td>DBJ50/T-513-2025</td>
    <td>建设工程消防施工质量验收标准</td>
    <td>2025-02-20</td>
    <td>2025-07-01</td>
    <td>现行</td>
    <td></td>
    <td></td>
    <td>另一单位</td>
    <td>适用范围说明</td>
    <td>1 总则</td>
    <td>【下载】</td>
    <td>意见反馈</td>
  </tr>
</table>`

describe('useCqdb', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('query builds a code-based URL with year stripped', async () => {
    const raceFn = raceMock as ReturnType<typeof vi.fn>
    raceFn.mockResolvedValueOnce(cqdbPage)

    const { query } = useCqdb()
    await query('DBJ50/T-562⁃2026')

    const url = raceFn.mock.calls[0][0] as string
    expect(url).toContain('https://cq.dingyi.de/x/down.php?')
    // stdBase 剥离年份: DBJ50/T-562⁃2026 -> DBJ50/T-562
    expect(url).toContain('code=DBJ50%2FT-562')
    expect(url).toContain('title=&')
  })

  it('query parses layui-table rows with fields and pdf url', async () => {
    const raceFn = raceMock as ReturnType<typeof vi.fn>
    raceFn.mockResolvedValueOnce(cqdbPage)

    const { query } = useCqdb()
    const results = await query('DBJ50/T-522-2025')

    // 影子表格不应产生重复行
    expect(results).toHaveLength(2)
    expect(results[0].standard_number).toBe('DBJ50/T-522⁃2025')
    expect(results[0].title).toBe('建筑分布式光伏电站消防技术标准')
    expect(results[0].status).toBe('现行')
    expect(results[0].publish_date).toBe('2025-01-10')
    expect(results[0].implement_date).toBe('2025-06-01')
    expect(results[0].publisher).toBe('某单位')
    expect(results[0].pdf_url).toBe('http://183.66.41.2:3757/x/x_upfile/202501/abc.pdf')
    expect(results[1].pdf_url).toBe('http://183.66.41.2:3757/x/x_upfile/202502/def.pdf')
  })

  it('queryByName builds a title-based URL with empty code', async () => {
    const raceFn = raceMock as ReturnType<typeof vi.fn>
    raceFn.mockResolvedValueOnce(cqdbPage)

    const { queryByName } = useCqdb()
    await queryByName('消防')

    const url = raceFn.mock.calls[0][0] as string
    expect(url).toContain('https://cq.dingyi.de/x/down.php?')
    expect(url).toContain('title=%E6%B6%88%E9%98%B2')
    expect(url).toContain('code=&')
  })

  it('queryByName parses results from the name-search page', async () => {
    const raceFn = raceMock as ReturnType<typeof vi.fn>
    raceFn.mockResolvedValueOnce(cqdbPage)

    const { queryByName } = useCqdb()
    const results = await queryByName('消防')

    expect(results).toHaveLength(2)
    expect(results[0].query).toBe('消防')
    expect(results[0].standard_number).toBe('DBJ50/T-522⁃2025')
    expect(results[0].pdf_url).toBe('http://183.66.41.2:3757/x/x_upfile/202501/abc.pdf')
  })

  it('queryByName returns empty when all proxies fail', async () => {
    const raceFn = raceMock as ReturnType<typeof vi.fn>
    raceFn.mockResolvedValueOnce(null)

    const { queryByName } = useCqdb()
    const results = await queryByName('消防')

    expect(results).toEqual([])
  })

  it('queryByName returns empty when race throws', async () => {
    const raceFn = raceMock as ReturnType<typeof vi.fn>
    raceFn.mockRejectedValueOnce(new Error('network error'))

    const { queryByName } = useCqdb()
    const results = await queryByName('消防')

    expect(results).toEqual([])
  })
})
