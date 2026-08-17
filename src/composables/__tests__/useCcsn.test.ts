import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCcsn } from '../useCcsn'

const raceMock = vi.fn()
const fetchDirectMock = vi.fn()

vi.mock('../../stores/log', () => ({
  useLogStore: () => ({ add: vi.fn() }),
}))

vi.mock('../useProxy', () => ({
  useProxy: () => ({ race: raceMock, fetchDirect: fetchDirectMock }),
}))

const ccsnResponse = {
  Total: 1,
  List: [{
    StandardCode: 'GB/T50010-2010（2024年版）',
    StandardCNName: '混凝土结构设计标准',
    StandardState: '现行',
    ReplaceStandardCode: 'GB50010-2010（2015年版）',
    PublishDate: '2024-04-24T00:00:00',
    PerformDate: '2024-08-01T00:00:00',
    AbolishDate: null,
    ApprovalDep: '中华人民共和国住房和城乡建设部',
  }],
}

describe('useCcsn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries with stripped code after GB-prefixed query fails', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce(null) // GB50010-2010 -> 无结果
      .mockResolvedValueOnce(JSON.stringify(ccsnResponse)) // 50010-2010 -> 命中

    const { query } = useCcsn()
    const results = await query('GB 50010-2010')

    const urls = mock.mock.calls.map(([u]) => u as string)
    expect(urls[0]).toContain('gjz=GB50010-2010')
    expect(urls[1]).toContain('gjz=50010-2010')
    expect(results).toHaveLength(1)
    expect(results[0].standard_number).toBe('GB/T50010-2010（2024年版）')
    expect(results[0].title).toBe('混凝土结构设计标准')
    expect(results[0].status).toBe('现行')
    expect(results[0].publish_date).toBe('2024-04-24')
    expect(results[0].implement_date).toBe('2024-08-01')
    expect(results[0].replaced_by).toBe('GB50010-2010（2015年版）')
    expect(results[0].publisher).toBe('中华人民共和国住房和城乡建设部')
  })

  it('falls through candidates when base query has no results', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce(null) // GB50010-2010
      .mockResolvedValueOnce(null) // 50010-2010
      .mockResolvedValueOnce(JSON.stringify(ccsnResponse)) // 50010

    const { query } = useCcsn()
    const results = await query('GB 50010-2010')

    expect(mock).toHaveBeenCalledTimes(3)
    expect(results).toHaveLength(1)
  })

  it('returns empty when all candidates miss', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValue(JSON.stringify({ Total: 0, List: [] }))

    const { query } = useCcsn()
    const results = await query('GB 99999999-2099')

    expect(results).toEqual([])
  })

  it('filters out unrelated results from fuzzy search', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValue(JSON.stringify({
      Total: 2,
      List: [
        { ...ccsnResponse.List[0] },
        { StandardCode: 'GB50016-2014（2018年版）', StandardCNName: '建筑设计防火规范' },
      ],
    }))

    const { query } = useCcsn()
    const results = await query('GB 50010-2010')

    expect(results).toHaveLength(1)
    expect(results[0].standard_number).toBe('GB/T50010-2010（2024年版）')
  })

  it('maps abolished standard to 废止', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValue(JSON.stringify({
      Total: 1,
      List: [{
        ...ccsnResponse.List[0],
        AbolishDate: '2024-06-01T00:00:00',
        StandardState: '现行',
      }],
    }))

    const { query } = useCcsn()
    const results = await query('GB 50010-2010')

    expect(results[0].status).toBe('废止')
  })
})
