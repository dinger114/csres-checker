import { ref, computed } from 'vue'
import type { StandardResult, ProgressState } from '../types'
import { BATCH_SIZE, BATCH_DELAY } from '../utils/constants'
import { normalizeKeyword } from '../utils/normalize'
import { useCssn } from './useCssn'
import { useGongbiaoku } from './useGongbiaoku'
import { useCsres } from './useCsres'
import { useBzsou } from './useBzsou'
import { useLog } from './useLog'
import { useFirebase } from './useFirebase'
import { useCache } from './useCache'

export function useQuery() {
  const results = ref<StandardResult[]>([])
  const progress = ref<ProgressState>({ current: 0, total: 0, pct: 0 })
  const running = ref(false)

  const cssn = useCssn()
  const gongbiaoku = useGongbiaoku()
  const csres = useCsres()
  const bzsou = useBzsou()
  const { add, updateStats } = useLog()
  const { incQueryCount } = useFirebase()
  const cache = useCache()

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

  async function query(keywords: string[], sources: string[] = []) {
    if (running.value) return
    running.value = true
    results.value = []
    progress.value = { current: 0, total: keywords.length, pct: 0 }

    const startTime = Date.now()
    const normalizedKws = keywords.map(normalizeKeyword).filter(Boolean)
    const useAllSources = sources.length === 0

    if (normalizedKws.length === 0) {
      add('请输入标准编号', 'warn')
      running.value = false
      return
    }

    add(`═══ START: ${normalizedKws.length} items ═══`, 'highlight')
    add(`cache: ${cache.size()} entries`, 'info')
    if (!useAllSources) {
      add(`selected: ${sources.join(', ')}`, 'info')
    }
    add(`────────────────────────────────`, 'info')

    const allResults: StandardResult[] = []
    const uncachedKeywords: string[] = []

    // Check cache first
    for (const kw of normalizedKws) {
      const cached = cache.get(kw)
      if (cached) {
        add(`cache hit: "${kw}"`, 'success')
        allResults.push(...cached)
      } else {
        uncachedKeywords.push(kw)
      }
    }

    if (uncachedKeywords.length === 0) {
      add(`all ${normalizedKws.length} items from cache`, 'success')
    } else {
      add(`${uncachedKeywords.length} items need fetching`, 'info')
    }

    results.value = [...allResults]

    if (uncachedKeywords.length > 0) {
      // Helper to run a phase
      async function runPhase(
        name: string,
        source: { query: (kw: string) => Promise<StandardResult[]> },
        keywords: string[]
      ): Promise<string[]> {
        if (keywords.length === 0) return []
        add(`────────────────────────────────`, 'info')
        add(`phase: ${name} (${keywords.length} items)`, 'info')

        const empty: string[] = []
        for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
          const batch = keywords.slice(i, i + BATCH_SIZE)
          const batchResults = await Promise.allSettled(batch.map((kw) => source.query(kw)))
          batchResults.forEach((r, idx) => {
            if (r.status === 'fulfilled' && r.value.length > 0) {
              allResults.push(...r.value)
              cache.set(batch[idx], r.value)
            } else {
              empty.push(batch[idx])
            }
          })
          results.value = [...allResults]
          if (i + BATCH_SIZE < keywords.length) await delay(BATCH_DELAY)
        }
        return empty
      }

      if (useAllSources) {
        // Default flow: cssn → gongbiaoku → csres → bzsou
        add(`phase1: cssn.net.cn`, 'info')
        add(`phase2: gongbiaoku.com fallback`, 'info')
        add(`phase3: csres.com fallback`, 'info')
        add(`phase4: bzsou.cn fallback`, 'info')

        let empty = await runPhase('cssn.net.cn', cssn, uncachedKeywords)
        empty = await runPhase('gongbiaoku.com', gongbiaoku, empty)
        empty = await runPhase('csres.com', csres, empty)
        await runPhase('bzsou.cn', bzsou, empty)
      } else {
        // Custom source selection: run all selected in parallel
        add(`────────────────────────────────`, 'info')
        add(`running selected sources in parallel`, 'info')

        const sourceMap: Record<string, { query: (kw: string) => Promise<StandardResult[]> }> = {
          cssn,
          gongbiaoku,
          csres,
          bzsou,
        }

        const selectedSources = sources.filter((s) => sourceMap[s])
        const foundKeywords = new Set<string>()

        for (const srcKey of selectedSources) {
          const source = sourceMap[srcKey]
          add(`──── ${srcKey} ────`, 'info')

          for (let i = 0; i < uncachedKeywords.length; i += BATCH_SIZE) {
            const batch = uncachedKeywords.slice(i, i + BATCH_SIZE)
            const batchResults = await Promise.allSettled(batch.map((kw) => source.query(kw)))
            batchResults.forEach((r, idx) => {
              if (r.status === 'fulfilled' && r.value.length > 0) {
                allResults.push(...r.value)
                cache.set(batch[idx], r.value)
                foundKeywords.add(batch[idx])
              }
            })
            results.value = [...allResults]
            if (i + BATCH_SIZE < uncachedKeywords.length) await delay(BATCH_DELAY)
          }
        }

        // For keywords not found by selected sources, try remaining sources
        const remaining = uncachedKeywords.filter((kw) => !foundKeywords.has(kw))
        if (remaining.length > 0) {
          add(`────────────────────────────────`, 'info')
          add(`fallback: ${remaining.length} items not found`, 'warn')

          const remainingSources = ['cssn', 'gongbiaoku', 'csres', 'bzsou'].filter(
            (s) => !sources.includes(s)
          )

          for (const srcKey of remainingSources) {
            const source = sourceMap[srcKey]
            const stillEmpty: string[] = []

            for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
              const batch = remaining.slice(i, i + BATCH_SIZE)
              const batchResults = await Promise.allSettled(batch.map((kw) => source.query(kw)))
              batchResults.forEach((r, idx) => {
                if (r.status === 'fulfilled' && r.value.length > 0) {
                  allResults.push(...r.value)
                  cache.set(batch[idx], r.value)
                } else {
                  stillEmpty.push(batch[idx])
                }
              })
              results.value = [...allResults]
              if (i + BATCH_SIZE < remaining.length) await delay(BATCH_DELAY)
            }

            remaining.splice(0, remaining.length, ...stillEmpty)
            if (remaining.length === 0) break
          }
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    progress.value = { current: normalizedKws.length, total: normalizedKws.length, pct: 100 }

    updateStats({
      time: parseFloat(elapsed),
      queries: normalizedKws.length,
    })

    add(`────────────────────────────────`, 'info')
    add(`═══ COMPLETE: ${allResults.length} results, ${elapsed}s ═══`, 'highlight')
    add(`cache: ${cache.size()} entries`, 'info')

    incQueryCount()
    running.value = false
  }

  return {
    results: computed(() => results.value),
    progress: computed(() => progress.value),
    running: computed(() => running.value),
    query,
    clearCache: cache.clear,
    cacheSize: cache.size,
  }
}
