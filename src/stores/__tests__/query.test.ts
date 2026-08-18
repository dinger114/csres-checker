import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useQueryStore } from '../query'

const cssnQuery = vi.fn()
const bzsouQuery = vi.fn()
const ccsnQuery = vi.fn()
const gongQuery = vi.fn()
const csresQuery = vi.fn()
const cqdbQuery = vi.fn()
const atlasQuery = vi.fn()
const queryByName = vi.fn()

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
  useCqdb: () => ({ query: cqdbQuery }),
}))
vi.mock('../../composables/useAtlas', () => ({
  useAtlas: () => ({ query: atlasQuery }),
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
})
