import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCssn } from '../useCssn'

const raceMock = vi.fn()
const fetchDirectMock = vi.fn()

vi.mock('../../stores/log', () => ({
  useLogStore: () => ({ add: vi.fn() }),
}))

vi.mock('../useProxy', () => ({
  useProxy: () => ({ race: raceMock, fetchDirect: fetchDirectMock }),
}))

const cssnResponse = {
  results: [{
    a100: 'GB 50010-2010（2024年版）',
    a298: '混凝土结构设计标准',
    a000: '现行',
    a101: '2024-04-24',
    a205: '2024-08-01',
  }],
  next: null,
}

const cssnResponseWithReplaced = {
  results: [
    {
      a100: 'GB 50010-2010',
      a298: '混凝土结构设计标准',
      a000: '现行',
      a101: '2010-04-24',
      a205: '2010-08-01',
    },
    {
      a100: 'GB 50010-2002',
      a298: '混凝土结构设计规范',
      a000: '被代替',
      a101: '2002-09-01',
      a205: '2003-06-01',
    },
  ],
  next: null,
}

describe('useCssn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('query returns StandardResult array', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce(JSON.stringify(cssnResponse))

    const { query } = useCssn()
    const results = await query('GB 50010')

    expect(results).toHaveLength(1)
    expect(results[0].standard_number).toBe('GB 50010-2010（2024年版）')
    expect(results[0].title).toBe('混凝土结构设计标准')
    expect(results[0].status).toBe('现行')
    expect(results[0].publish_date).toBe('2024-04-24')
    expect(results[0].implement_date).toBe('2024-08-01')
    expect(results[0].query).toBe('GB 50010')
  })

  it('falls back to race when direct fetch fails', async () => {
    const directMock = fetchDirectMock as ReturnType<typeof vi.fn>
    directMock.mockResolvedValueOnce(null)

    const raceFnMock = raceMock as ReturnType<typeof vi.fn>
    raceFnMock.mockResolvedValueOnce(JSON.stringify(cssnResponse))

    const { query } = useCssn()
    const results = await query('GB 50010')

    expect(directMock).toHaveBeenCalledOnce()
    expect(raceFnMock).toHaveBeenCalledOnce()
    expect(results).toHaveLength(1)
  })

  it('falls back to race when direct fetch returns non-JSON', async () => {
    const directMock = fetchDirectMock as ReturnType<typeof vi.fn>
    directMock.mockResolvedValueOnce('<html>error</html>')

    const raceFnMock = raceMock as ReturnType<typeof vi.fn>
    raceFnMock.mockResolvedValueOnce(JSON.stringify(cssnResponse))

    const { query } = useCssn()
    const results = await query('GB 50010')

    expect(raceFnMock).toHaveBeenCalledOnce()
    expect(results).toHaveLength(1)
  })

  it('handles API errors gracefully', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockRejectedValueOnce(new Error('Network timeout'))

    const { query } = useCssn()
    const results = await query('GB 50010')

    expect(results).toEqual([])
  })

  it('returns empty when direct and race both return null', async () => {
    const directMock = fetchDirectMock as ReturnType<typeof vi.fn>
    directMock.mockResolvedValueOnce(null)

    const raceFnMock = raceMock as ReturnType<typeof vi.fn>
    raceFnMock.mockResolvedValueOnce(null)

    const { query } = useCssn()
    const results = await query('GB 50010')

    expect(results).toEqual([])
  })

  it('returns empty when no results match the query', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce(JSON.stringify({
      results: [{
        a100: 'GB 50016-2014（2018年版）',
        a298: '建筑设计防火规范',
        a000: '现行',
        a101: '2018-05-09',
        a205: '2018-12-01',
      }],
      next: null,
    }))

    const { query } = useCssn()
    const results = await query('GB 50010')

    expect(results).toEqual([])
  })

  it('normalizes 未生效 status to 即将实施', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce(JSON.stringify({
      results: [{
        a100: 'GB 50010-2010',
        a298: '混凝土结构设计标准',
        a000: '未生效',
        a101: '2024-01-01',
        a205: '2024-06-01',
      }],
      next: null,
    }))

    const { query } = useCssn()
    const results = await query('GB 50010')

    expect(results).toHaveLength(1)
    expect(results[0].status).toBe('即将实施')
  })

  it('normalizes 历史 and 作废 status to 废止', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce(JSON.stringify({
      results: [
        {
          a100: 'GB 50010-2002',
          a298: '混凝土结构设计规范',
          a000: '历史',
          a101: '2002-04-01',
          a205: '2002-10-01',
        },
        {
          a100: 'GB 50010-2006',
          a298: '混凝土结构设计规范',
          a000: '作废',
          a101: '2006-04-01',
          a205: '2006-10-01',
        },
      ],
      next: null,
    }))

    const { query } = useCssn()
    const results = await query('GB 50010')

    expect(results).toHaveLength(2)
    expect(results[0].status).toBe('废止')
    expect(results[1].status).toBe('废止')
  })

  it('filters out English versions', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce(JSON.stringify({
      results: [
        {
          a100: 'GB 50010-2010（2024年版）',
          a298: '混凝土结构设计标准',
          a000: '现行',
          a101: '2024-04-24',
          a205: '2024-08-01',
        },
        {
          a100: 'GB 50010-2010(英文版)',
          a298: 'Code for design of concrete structures',
          a000: '现行',
          a101: '2024-04-24',
          a205: '2024-08-01',
        },
      ],
      next: null,
    }))

    const { query } = useCssn()
    const results = await query('GB 50010')

    expect(results).toHaveLength(1)
    expect(results[0].standard_number).not.toContain('英文')
  })

  it('filters out items without a000 status', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce(JSON.stringify({
      results: [
        {
          a100: 'GB 50010-2010',
          a298: '混凝土结构设计标准',
          a000: '',
          a101: '2024-04-24',
          a205: '2024-08-01',
        },
      ],
      next: null,
    }))

    const { query } = useCssn()
    const results = await query('GB 50010')

    expect(results).toEqual([])
  })

  it('computes replaced_by for superseded standards', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce(JSON.stringify(cssnResponseWithReplaced))

    const { query } = useCssn()
    const results = await query('GB 50010')

    const replaced = results.find(r => r.standard_number === 'GB 50010-2002')
    expect(replaced).toBeDefined()
    expect(replaced!.status).toBe('被代替')
    expect(replaced!.replaced_by).toBe('GB 50010-2010')
  })

  it('returns empty when fetchRaw returns empty results array', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce(JSON.stringify({ results: [], next: null }))

    const { query } = useCssn()
    const results = await query('GB 50010')

    expect(results).toEqual([])
  })

  it('normalizes keyword with special characters', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce(JSON.stringify(cssnResponse))

    const { query } = useCssn()
    const results = await query('  GB  50010  ')

    // Should have been normalized to 'GB 50010' before API call
    const url = mock.mock.calls[0][0] as string
    expect(url).toContain('keyword=GB%2050010')
    expect(results).toHaveLength(1)
  })

  it('convertsGBT to GB/T in keyword', async () => {
    const mock = fetchDirectMock as ReturnType<typeof vi.fn>
    mock.mockResolvedValueOnce(JSON.stringify(cssnResponse))

    const { query } = useCssn()
    await query('GBT50010')

    const url = mock.mock.calls[0][0] as string
    expect(url).toContain('keyword=GB%2FT50010')
  })

  describe('queryByName', () => {
    it('paginates through multiple pages', async () => {
      const mock = fetchDirectMock as ReturnType<typeof vi.fn>
      mock.mockResolvedValueOnce(JSON.stringify({
        results: [{ a100: 'GB 50010-2010', a298: '混凝土结构设计标准', a000: '现行', a101: '2010-01-01', a205: '2010-06-01' }],
        next: 'page2',
      }))
      mock.mockResolvedValueOnce(JSON.stringify({
        results: [{ a100: 'GB/T 50010-2010', a298: '混凝土结构设计规范', a000: '现行', a101: '2010-01-01', a205: '2010-06-01' }],
        next: null,
      }))

      const { queryByName } = useCssn()
      const results = await queryByName('混凝土')

      // Page 1 fetched, page 2 fetched, page 3 not fetched (next=null)
      expect(mock).toHaveBeenCalledTimes(2)
      expect(results.length).toBeGreaterThanOrEqual(2)
    })

    it('stops pagination when next is null', async () => {
      const mock = fetchDirectMock as ReturnType<typeof vi.fn>
      mock.mockResolvedValueOnce(JSON.stringify({
        results: [{ a100: 'GB 50010-2010', a298: '混凝土结构设计标准', a000: '现行', a101: '2010-01-01', a205: '2010-06-01' }],
        next: null,
      }))

      const { queryByName } = useCssn()
      await queryByName('混凝土')

      expect(mock).toHaveBeenCalledTimes(1)
    })

    it('handles errors in queryByName gracefully', async () => {
      const mock = fetchDirectMock as ReturnType<typeof vi.fn>
      mock.mockRejectedValueOnce(new Error('fetch failed'))

      const { queryByName } = useCssn()
      const results = await queryByName('混凝土')

      expect(results).toEqual([])
    })

    it('returns empty when no results found', async () => {
      const mock = fetchDirectMock as ReturnType<typeof vi.fn>
      mock.mockResolvedValueOnce(JSON.stringify({ results: [], next: null }))

      const { queryByName } = useCssn()
      const results = await queryByName('不存在的标准')

      expect(results).toEqual([])
    })

    it('sorts results by prefix priority', async () => {
      const mock = fetchDirectMock as ReturnType<typeof vi.fn>
      mock.mockResolvedValueOnce(JSON.stringify({
        results: [
          { a100: 'DB11/T 100-2020', a298: '地方标准', a000: '现行', a101: '2020-01-01', a205: '2020-06-01' },
          { a100: 'GB 50010-2010', a298: '国家标准', a000: '现行', a101: '2010-01-01', a205: '2010-06-01' },
          { a100: 'ISO 1234-2020', a298: '国际标准', a000: '现行', a101: '2020-01-01', a205: '2020-06-01' },
        ],
        next: null,
      }))

      const { queryByName } = useCssn()
      const results = await queryByName('标准')

      // GB (tier 0) < DB (tier 3) < ISO (tier 4)
      expect(results[0].standard_number).toBe('GB 50010-2010')
      expect(results[1].standard_number).toBe('DB11/T 100-2020')
      expect(results[2].standard_number).toBe('ISO 1234-2020')
    })
  })
})
