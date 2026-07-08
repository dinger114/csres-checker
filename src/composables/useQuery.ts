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

const SEPARATOR = '────────────────────────────────'

export function useQuery() {
  const results = ref<StandardResult[]>([])
  const progress = ref<ProgressState>({ current: 0, total: 0, pct: 0 })
  const running = ref(false)
  const cacheEnabled = ref(true)

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

    add('═══ START: ' + normalizedKws.length + ' items ═══', 'highlight')
    if (!cacheEnabled.value) {
      add('cache: disabled', 'warn')
    } else {
      add('cache: ' + cache.size() + ' entries', 'info')
    }
    if (!useAllSources) {
      add('selected: ' + sources.join(', '), 'info')
    }
    add(SEPARATOR, 'info')

    const allResults: StandardResult[] = []
    const uncachedKeywords: string[] = []

    if (cacheEnabled.value) {
      for (const kw of normalizedKws) {
        const cached = cache.get(kw)
        if (cached) {
          add('cache hit: "' + kw + '"', 'success')
          allResults.push(...cached)
        } else {
          uncachedKeywords.push(kw)
        }
      }
    } else {
      uncachedKeywords.push(...normalizedKws)
    }

    if (uncachedKeywords.length === 0) {
      add('all ' + normalizedKws.length + ' items from cache', 'success')
    } else {
      add(uncachedKeywords.length + ' items need fetching', 'info')
    }

    results.value = [...allResults]

    if (uncachedKeywords.length > 0) {
      async function runPhase(
        name: string,
        source: { query: (kw: string) => Promise<StandardResult[]> },
        kws: string[]
      ): Promise<string[]> {
        if (kws.length === 0) return []
        add(SEPARATOR, 'info')
        add('phase: ' + name + ' (' + kws.length + ' items)', 'info')

        const empty: string[] = []
        for (let i = 0; i < kws.length; i += BATCH_SIZE) {
          const batch = kws.slice(i, i + BATCH_SIZE)
          const batchResults = await Promise.allSettled(batch.map((kw) => source.query(kw)))
          batchResults.forEach((r, idx) => {
            if (r.status === 'fulfilled' && r.value.length > 0) {
              allResults.push(...r.value)
              if (cacheEnabled.value) cache.set(batch[idx], r.value)
            } else {
              empty.push(batch[idx])
            }
          })
          results.value = [...allResults]
          if (i + BATCH_SIZE < kws.length) await delay(BATCH_DELAY)
        }
        return empty
      }

      if (useAllSources) {
        add('tier1: cssn.net.cn + bzsou.cn (parallel)', 'info')
        add('tier2: gongbiaoku.com fallback', 'info')
        add('tier3: csres.com fallback', 'info')

        add(SEPARATOR, 'info')
        add('tier1: running cssn + bzsou', 'info')

        const foundInTier1 = new Set<string>()
        const tier1Sources = [
          { name: 'cssn', source: cssn },
          { name: 'bzsou', source: bzsou },
        ]

        for (const { name, source } of tier1Sources) {
          add('──── ' + name + ' ────', 'info')
          for (let i = 0; i < uncachedKeywords.length; i += BATCH_SIZE) {
            const batch = uncachedKeywords.slice(i, i + BATCH_SIZE)
            // Only query keywords not yet found
            const toQuery = batch.filter((kw) => !foundInTier1.has(kw))
            if (toQuery.length === 0) continue
            const batchResults = await Promise.allSettled(toQuery.map((kw) => source.query(kw)))
            batchResults.forEach((r, idx) => {
              if (r.status === 'fulfilled' && r.value.length > 0) {
                allResults.push(...r.value)
                if (cacheEnabled.value) cache.set(toQuery[idx], r.value)
                foundInTier1.add(toQuery[idx])
              }
            })
            results.value = [...allResults]
            if (i + BATCH_SIZE < uncachedKeywords.length) await delay(BATCH_DELAY)
          }
        }

        const tier2Keywords = uncachedKeywords.filter((kw) => !foundInTier1.has(kw))
        if (tier2Keywords.length > 0) {
          await runPhase('gongbiaoku.com', gongbiaoku, tier2Keywords)
        }

        const tier3Keywords = uncachedKeywords.filter((kw) => {
          return !allResults.some((r) => r.query === kw)
        })
        if (tier3Keywords.length > 0) {
          await runPhase('csres.com', csres, tier3Keywords)
        }
      } else {
        add(SEPARATOR, 'info')
        add('running selected sources in parallel', 'info')

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
          add('──── ' + srcKey + ' ────', 'info')

          for (let i = 0; i < uncachedKeywords.length; i += BATCH_SIZE) {
            const batch = uncachedKeywords.slice(i, i + BATCH_SIZE)
            const batchResults = await Promise.allSettled(batch.map((kw) => source.query(kw)))
            batchResults.forEach((r, idx) => {
              if (r.status === 'fulfilled' && r.value.length > 0) {
                allResults.push(...r.value)
                if (cacheEnabled.value) cache.set(batch[idx], r.value)
                foundKeywords.add(batch[idx])
              }
            })
            results.value = [...allResults]
            if (i + BATCH_SIZE < uncachedKeywords.length) await delay(BATCH_DELAY)
          }
        }

        const remaining = uncachedKeywords.filter((kw) => !foundKeywords.has(kw))
        if (remaining.length > 0) {
          add(SEPARATOR, 'info')
          add('fallback: ' + remaining.length + ' items not found', 'warn')

          const remainingSources = ['cssn', 'bzsou', 'gongbiaoku', 'csres'].filter(
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
                  if (cacheEnabled.value) cache.set(batch[idx], r.value)
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

    // Deduplicate by standard number (keep result with most complete data)
    const dedupedMap = new Map<string, StandardResult>()
    for (const r of allResults) {
      const key = r.standard_number.toLowerCase().replace(/\s/g, '')
      const existing = dedupedMap.get(key)
      if (!existing) {
        dedupedMap.set(key, r)
      } else {
        // Keep the one with more complete data
        const existingScore = [existing.title, existing.publish_date, existing.implement_date, existing.replaced_by].filter(Boolean).length
        const newScore = [r.title, r.publish_date, r.implement_date, r.replaced_by].filter(Boolean).length
        if (newScore > existingScore) {
          dedupedMap.set(key, r)
        }
      }
    }
    const dedupedResults = Array.from(dedupedMap.values())

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    progress.value = { current: normalizedKws.length, total: normalizedKws.length, pct: 100 }

    updateStats({
      time: parseFloat(elapsed),
      queries: normalizedKws.length,
    })

    add(SEPARATOR, 'info')
    add('═══ COMPLETE: ' + dedupedResults.length + ' results (deduped from ' + allResults.length + '), ' + elapsed + 's ═══', 'highlight')
    if (cacheEnabled.value) {
      add('cache: ' + cache.size() + ' entries', 'info')
    }

    // Update results with deduped data
    results.value = dedupedResults

    incQueryCount()
    running.value = false
  }

  function toggleCache() {
    cacheEnabled.value = !cacheEnabled.value
  }

  return {
    results: computed(() => results.value),
    progress: computed(() => progress.value),
    running: computed(() => running.value),
    cacheEnabled: computed(() => cacheEnabled.value),
    query,
    toggleCache,
    clearCache: cache.clear,
    cacheSize: cache.size,
  }
}
