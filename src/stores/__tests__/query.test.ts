import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useQueryStore } from '../query'

const cssnQuery = vi.fn()
const bzsouQuery = vi.fn()
const ccsnQuery = vi.fn()
const gongQuery = vi.fn()
const csresQuery = vi.fn()
const cqdbQuery = vi.fn()
const cqdbQueryByName = vi.fn()
const shanxiQuery = vi.fn()
const shanxiQueryByName = vi.fn()
const atlasQuery = vi.fn()
const queryByName = vi.fn()
const incQueryCount = vi.fn().mockResolvedValue(undefined)
const refreshCount = vi.fn().mockResolvedValue(undefined)
const capHasValidToken = vi.fn().mockReturnValue(true)
const capEndSession = vi.fn()

vi.mock('../../composables/useCap', () => ({
  useCap: () => ({ hasValidToken: capHasValidToken, endSession: capEndSession }),
}))

vi.mock('../../composables/useCssn', () => ({
  useCssn: () => ({ query: cssnQuery, queryByName }),
}))
vi.mock('../../composables/useBzsou', () => ({
  useBzsou: () => ({ query: bzsouQuery }),
}))
vi.mock('../../composables/useCcsn', () => ({
  useCcsn: () => ({ query: ccsnQuery }),
}))
vi.mock('../../composables/useGongbiaoku', () => ({
  useGongbiaoku: () => ({ query: gongQuery }),
}))
vi.mock('../../composables/useCsres', () => ({
  useCsres: () => ({ query: csresQuery }),
}))
vi.mock('../../composables/useCqdb', () => ({
  useCqdb: () => ({ query: cqdbQuery, queryByName: cqdbQueryByName }),
}))
vi.mock('../../composables/useShanxi', () => ({
  useShanxi: () => ({ query: shanxiQuery, queryByName: shanxiQueryByName }),
}))
vi.mock('../../composables/useAtlas', () => ({
  useAtlas: () => ({ query: atlasQuery }),
}))
vi.mock('../../composables/useCounter', () => ({
  useCounter: () => ({ incQueryCount, refreshCount, globalCount: ref(0) }),
}))

function baseResult(stdNo: string) {
  return {
    query: '',
    standard_number: stdNo,
    title: `${stdNo} title`,
    status: '现行',
    publish_date: '',
    implement_date: '',
    replaced_by: '',
    publisher: '',
    category: '',
    ics: '',
  }
}

describe('useQueryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('reports successful keyword count to counter (per-keyword)', async () => {
    cssnQuery.mockResolvedValue([baseResult('GB 50010-2010')])
    bzsouQuery.mockResolvedValue([baseResult('GB 50011-2010')])

    const store = useQueryStore()
    await store.query(['GB 50010-2010', 'GB 50011-2010'])

    // 2 个关键词各自命中 → incQueryCount(2)
    expect(incQueryCount).toHaveBeenCalledWith(2)
  })

  it('does not report when no keyword returns results', async () => {
    cssnQuery.mockResolvedValue([])
    bzsouQuery.mockResolvedValue([])
    ccsnQuery.mockResolvedValue([])
    gongQuery.mockResolvedValue([])
    csresQuery.mockResolvedValue([])

    const store = useQueryStore()
    await store.query(['GB 50010-2010'])

    expect(incQueryCount).not.toHaveBeenCalled()
  })

  it('runs the cssn → bzsou → ccsn → gongbiaoku → csres fallback chain', async () => {
    cssnQuery.mockResolvedValue([])
    bzsouQuery.mockResolvedValue([])
    ccsnQuery.mockResolvedValue([])
    gongQuery.mockResolvedValue([])
    csresQuery.mockResolvedValue([baseResult('GB 50010-2010')])

    const store = useQueryStore()
    await store.query(['GB 50010-2010'])

    expect(cssnQuery).toHaveBeenCalledWith('GB 50010-2010')
    expect(bzsouQuery).toHaveBeenCalledWith('GB 50010-2010')
    expect(ccsnQuery).toHaveBeenCalledWith('GB 50010-2010')
    expect(gongQuery).toHaveBeenCalledWith('GB 50010-2010')
    expect(csresQuery).toHaveBeenCalledWith('GB 50010-2010')
    expect(store.results).toHaveLength(1)
    expect(store.results[0].standard_number).toBe('GB 50010-2010')
    expect(store.running).toBe(false)
  })

  it('stops the chain once a source returns results', async () => {
    cssnQuery.mockResolvedValue([baseResult('GB 50010-2010')])

    const store = useQueryStore()
    await store.query(['GB 50010-2010'])

    expect(cssnQuery).toHaveBeenCalledTimes(1)
    expect(bzsouQuery).not.toHaveBeenCalled()
    expect(gongQuery).not.toHaveBeenCalled()
    expect(csresQuery).not.toHaveBeenCalled()
  })

  it('maps result query back to the original keyword form', async () => {
    cssnQuery.mockResolvedValue([baseResult('GB 50010-2010')])

    const store = useQueryStore()
    await store.query(['GB50010-2010'])

    expect(store.results[0].query).toBe('GB50010-2010')
  })

  it('uses the selected source when provided', async () => {
    cqdbQuery.mockResolvedValue([baseResult('DBJ50/T-562')])

    const store = useQueryStore()
    await store.query(['DBJ50/T-562'], 'cqdb')

    expect(cqdbQuery).toHaveBeenCalled()
    expect(cssnQuery).not.toHaveBeenCalled()
    expect(store.results[0].standard_number).toBe('DBJ50/T-562')
  })

  it('routes to shanxi when source is shanxi (且不入默认链)', async () => {
    shanxiQuery.mockResolvedValue([baseResult('DBJ04/T389-2026')])

    const store = useQueryStore()
    await store.query(['DBJ04/T389-2026'], 'shanxi')

    expect(shanxiQuery).toHaveBeenCalled()
    expect(cssnQuery).not.toHaveBeenCalled()
    expect(store.results[0].standard_number).toBe('DBJ04/T389-2026')
  })

  it('默认降级链不包含 shanxi', async () => {
    cssnQuery.mockResolvedValue([baseResult('GB 50010-2010')])

    const store = useQueryStore()
    await store.query(['GB 50010-2010'])

    expect(shanxiQuery).not.toHaveBeenCalled()
    expect(cqdbQuery).not.toHaveBeenCalled()
  })

  it('searchByName routes to shanxi when source is shanxi', async () => {
    shanxiQueryByName.mockResolvedValue([baseResult('DBJ04/T389-2026')])

    const store = useQueryStore()
    await store.searchByName(['城市综合管廊'], 'shanxi')

    expect(shanxiQueryByName).toHaveBeenCalledWith('城市综合管廊')
    expect(queryByName).not.toHaveBeenCalled()
    expect(store.results[0].standard_number).toBe('DBJ04/T389-2026')
  })

  it('does not start a second run while running', async () => {
    let resolveFirst: ((value?: unknown) => void) | undefined
    cssnQuery.mockReturnValue(new Promise((r) => {
      resolveFirst = r
    }).then(() => [baseResult('GB 50010-2010')]))

    const store = useQueryStore()
    const first = store.query(['GB 50010-2010'])
    const second = store.query(['GB 50011-2010'])
    resolveFirst!()
    await first
    await second

    expect(cssnQuery).toHaveBeenCalledTimes(1)
  })

  it('searchByName queries cssn and updates progress to 100%', async () => {
    queryByName.mockResolvedValue([baseResult('GB 50010-2010')])

    const store = useQueryStore()
    await store.searchByName(['消防'])

    expect(queryByName).toHaveBeenCalledWith('消防')
    expect(store.results).toHaveLength(1)
    expect(store.progress.pct).toBe(100)
    expect(store.running).toBe(false)
  })

  it('searchByName warns and aborts when keywords are empty', async () => {
    const store = useQueryStore()
    await store.searchByName([''])

    expect(queryByName).not.toHaveBeenCalled()
    expect(store.results).toHaveLength(0)
    expect(store.running).toBe(false)
  })

  it('searchByName routes to cqdb when source is cqdb', async () => {
    cqdbQueryByName.mockResolvedValue([baseResult('DBJ50/T-522-2025')])

    const store = useQueryStore()
    await store.searchByName(['消防'], 'cqdb')

    expect(cqdbQueryByName).toHaveBeenCalledWith('消防')
    expect(queryByName).not.toHaveBeenCalled()
    expect(store.results).toHaveLength(1)
    expect(store.results[0].standard_number).toBe('DBJ50/T-522-2025')
    expect(store.running).toBe(false)
  })

  it('searchByName defaults to cssn for unknown source values', async () => {
    queryByName.mockResolvedValue([baseResult('GB 50010-2010')])

    const store = useQueryStore()
    await store.searchByName(['消防'], 'bzsou')

    expect(queryByName).toHaveBeenCalledWith('消防')
    expect(cqdbQueryByName).not.toHaveBeenCalled()
  })

  it('queryAtlas queries the atlas source', async () => {
    const atlasResult = { ...baseResult('05SJ810'), category: '标准图集' }
    atlasQuery.mockResolvedValue([atlasResult])

    const store = useQueryStore()
    await store.queryAtlas(['05SJ810'])

    expect(atlasQuery).toHaveBeenCalledWith('05SJ810')
    expect(store.results).toHaveLength(1)
    expect(store.results[0].standard_number).toBe('05SJ810')
    expect(store.progress.pct).toBe(100)
    expect(store.running).toBe(false)
  })

  it('queryAtlas aborts when keywords are empty', async () => {
    const store = useQueryStore()
    await store.queryAtlas([''])

    expect(atlasQuery).not.toHaveBeenCalled()
    expect(store.results).toHaveLength(0)
    expect(store.running).toBe(false)
  })

  it('aborts query when no valid cap token is present', async () => {
    capHasValidToken.mockReturnValueOnce(false)
    cssnQuery.mockResolvedValue([baseResult('GB 50010-2010')])

    const store = useQueryStore()
    await store.query(['GB 50010-2010'])

    expect(cssnQuery).not.toHaveBeenCalled()
    expect(store.results).toHaveLength(0)
    expect(store.running).toBe(false)
  })

  it('ends the cap session when a run completes', async () => {
    cssnQuery.mockResolvedValue([baseResult('GB 50010-2010')])

    const store = useQueryStore()
    await store.query(['GB 50010-2010'])

    expect(capEndSession).toHaveBeenCalledTimes(1)
  })

  it('does not end a cap session when the run aborts early (empty keywords)', async () => {
    const store = useQueryStore()
    await store.query([''])

    expect(capEndSession).not.toHaveBeenCalled()
  })

  // 回归：runSource 曾在循环步进与切片各调一次 adaptiveBatchSize()。
  // 批次间平均延迟跨档（>slowThreshold→1 / <fastThreshold→4）时两次取值不同，
  // 中间关键词既不查询也不进 failed（fallback 不会补），另一些被重复查询。
  it('queries every keyword exactly once when the adaptive batch size shifts mid-run', async () => {
    const kws = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6']
    const queried: string[] = []

    let clock = 0
    vi.spyOn(Date, 'now').mockImplementation(() => clock)

    const src = {
      query: vi.fn(async (kw: string) => {
        queried.push(kw)
        if (kw === 'K1')
          clock += 3000 * 4 // 首批 4 条，3000ms/条 → 下一轮 adaptiveBatchSize() 降到 1
        return [baseResult(kw)]
      }),
    }

    const store = useQueryStore()
    const failed = await store.runSource(
      'regression',
      src,
      kws,
      kws,
      new Map(kws.map((k, i) => [k, [i]])),
      new Map(),
    )

    vi.restoreAllMocks()

    expect(queried).toHaveLength(kws.length)
    expect([...queried].sort()).toEqual([...kws].sort())
    expect(failed).toEqual([])
  })
})
