import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBzsou } from '../useBzsou'

const raceMock = vi.fn()
const fetchDirectMock = vi.fn()

vi.mock('../../stores/log', () => ({
  useLogStore: () => ({ add: vi.fn() }),
}))

vi.mock('../useProxy', () => ({
  useProxy: () => ({ race: raceMock, fetchDirect: fetchDirectMock }),
}))

const bzsouResponse = {
  totalCount: 2,
  result: [
    {
      STAN_NUM: 'GB 50010-2010（2024年版）',
      STAN_CNNAME: '混凝土结构设计标准',
      STAN_STATUS: '现行',
      PUB_DATE: '2024-04-24T12:00:00Z',
      IMPL_DATE: '2024-08-01T12:00:00Z',
      RELEASE_ORG: '中华人民共和国住房和城乡建设部',
      CCS_NAME: 'P30/39',
      ICS_NAME: '91.010',
    },
    {
      STAN_NUM: 'GB 50016-2014（2018年版）',
      STAN_CNNAME: '建筑设计防火规范',
      STAN_STATUS: '现行',
      PUB_DATE: '2018-05-09T12:00:00Z',
      IMPL_DATE: '2018-12-01T12:00:00Z',
      RELEASE_ORG: '中华人民共和国住房和城乡建设部',
      CCS_NAME: 'P30/39',
      ICS_NAME: '13.220',
    },
  ],
}

describe('useBzsou', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns StandardResult array from direct fetch', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce(JSON.stringify(bzsouResponse))

    const { query } = useBzsou()
    const results = await query('GB 50010-2010')

    expect(results).toHaveLength(1)
    expect(results[0].standard_number).toBe('GB 50010-2010（2024年版）')
    expect(results[0].title).toBe('混凝土结构设计标准')
    expect(results[0].status).toBe('现行')
    expect(results[0].query).toBe('GB 50010-2010')
    expect(results[0].publish_date).toBe('2024-04-24')
    expect(results[0].implement_date).toBe('2024-08-01')
    expect(results[0].publisher).toBe('中华人民共和国住房和城乡建设部')
    expect(results[0].category).toBe('P30/39')
    expect(results[0].ics).toBe('91.010')
    expect(results[0].replaced_by).toBe('')
  })

  it('falls back to proxy when direct fetch returns non-JSON', async () => {
    const directMock = fetchDirectMock as ReturnType<typeof vi.fn>
    const raceFn = raceMock as ReturnType<typeof vi.fn>
    directMock.mockResolvedValueOnce('<html>error</html>')
    raceFn.mockResolvedValueOnce(JSON.stringify(bzsouResponse))

    const { query } = useBzsou()
    const results = await query('GB 50010-2010')

    expect(directMock).toHaveBeenCalledTimes(1)
    expect(raceFn).toHaveBeenCalledTimes(1)
    expect(results).toHaveLength(1)
  })

  it('falls back to proxy when direct fetch throws', async () => {
    const directMock = fetchDirectMock as ReturnType<typeof vi.fn>
    const raceFn = raceMock as ReturnType<typeof vi.fn>
    directMock.mockRejectedValueOnce(new Error('network error'))
    raceFn.mockResolvedValueOnce(JSON.stringify(bzsouResponse))

    const { query } = useBzsou()
    const results = await query('GB 50010-2010')

    expect(directMock).toHaveBeenCalledTimes(1)
    expect(raceFn).toHaveBeenCalledTimes(1)
    expect(results).toHaveLength(1)
  })

  it('returns empty when all fetch methods fail', async () => {
    const directMock = fetchDirectMock as ReturnType<typeof vi.fn>
    const raceFn = raceMock as ReturnType<typeof vi.fn>
    directMock.mockResolvedValueOnce(null)
    raceFn.mockResolvedValueOnce(null)

    const { query } = useBzsou()
    const results = await query('GB 50010-2010')

    expect(results).toEqual([])
  })

  it('returns empty when response has no results', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce(JSON.stringify({ totalCount: 0, result: [] }))

    const { query } = useBzsou()
    const results = await query('GB 99999999-2099')

    expect(results).toEqual([])
  })

  it('handles JSON parse errors gracefully', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce('not valid json')

    const { query } = useBzsou()
    const results = await query('GB 50010-2010')

    expect(results).toEqual([])
  })

  it('filters out unrelated results', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce(JSON.stringify(bzsouResponse))

    const { query } = useBzsou()
    const results = await query('GB 50010-2010')

    // Only GB 50010 should match, GB 50016 should be filtered out
    expect(results).toHaveLength(1)
    expect(results[0].standard_number).toBe('GB 50010-2010（2024年版）')
  })

  it('maps 部分废止 status to 现行', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce(JSON.stringify({
      totalCount: 1,
      result: [{
        ...bzsouResponse.result[0],
        STAN_STATUS: '部分废止',
      }],
    }))

    const { query } = useBzsou()
    const results = await query('GB 50010-2010')

    expect(results[0].status).toBe('现行')
  })

  it('strips HTML tags and entities from fields', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce(JSON.stringify({
      totalCount: 1,
      result: [{
        STAN_NUM: 'GB 50010-2010',
        STAN_CNNAME: '<b>混凝土结构</b>设计<b>标准</b>&mdash;2024年版',
        STAN_STATUS: '现行',
        PUB_DATE: '2024-04-24T12:00:00Z',
        IMPL_DATE: '2024-08-01T12:00:00Z',
        RELEASE_ORG: '住建部',
        CCS_NAME: '',
        ICS_NAME: '',
      }],
    }))

    const { query } = useBzsou()
    const results = await query('GB 50010-2010')

    expect(results[0].standard_number).toBe('GB 50010-2010')
    expect(results[0].title).toBe('混凝土结构设计标准—2024年版')
  })

  it('uses STAN_PART_YEAR when PUB_DATE is absent', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce(JSON.stringify({
      totalCount: 1,
      result: [{
        STAN_NUM: 'GB 50010-2010',
        STAN_CNNAME: '混凝土结构设计标准',
        STAN_STATUS: '现行',
        STAN_PART_YEAR: 2010,
        RELEASE_ORG: '住建部',
        CCS_NAME: '',
        ICS_NAME: '',
      }],
    }))

    const { query } = useBzsou()
    const results = await query('GB 50010-2010')

    expect(results[0].publish_date).toBe('2010')
    expect(results[0].implement_date).toBe('')
  })

  it('handles missing result array in response', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce(JSON.stringify({ totalCount: 5 }))

    const { query } = useBzsou()
    const results = await query('GB 50010-2010')

    expect(results).toEqual([])
  })
})
