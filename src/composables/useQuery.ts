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
  const cacheEnabled = ref(false)

  const cssn = useCssn()
  const gongbiaoku = useGongbiaoku()
  const csres = useCsres()
  const bzsou = useBzsou()
  const { add, updateStats } = useLog()
  const { incQueryCount } = useFirebase()
  const cache = useCache()

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

  async function query(keywords: string[], source: string = '') {
    if (running.value) return
    running.value = true
    results.value = []
    progress.value = { current: 0, total: keywords.length, pct: 0 }

    const startTime = Date.now()
    const normalizedKws = keywords.map(normalizeKeyword).filter(Boolean)
    const useDefault = source === ''

    if (normalizedKws.length === 0) {
      add('请输入标准编号', 'warn')
      running.value = false
      return
    }

    add('═══ START: ' + normalizedKws.length + ' items ═══', 'highlight')

    if (cacheEnabled.value && cache.isExpired()) {
      cacheEnabled.value = false
      add('cache: expired (>4h), disabled', 'warn')
    }

    if (!cacheEnabled.value) {
      add('cache: disabled', 'warn')
    } else {
      add('cache: ' + cache.size() + ' entries', 'info')
    }

    if (!useDefault) {
      add('selected: ' + source, 'info')
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
      async function runSource(
        name: string,
        src: { query: (kw: string) => Promise<StandardResult[]> },
        kws: string[]
      ): Promise<string[]> {
        if (kws.length === 0) return []
        add(SEPARATOR, 'info')
        add('phase: ' + name + ' (' + kws.length + ' items)', 'info')

        const failed: string[] = []
        for (let i = 0; i < kws.length; i += BATCH_SIZE) {
          const batch = kws.slice(i, i + BATCH_SIZE)
          const batchResults = await Promise.allSettled(batch.map((kw) => src.query(kw)))
          batchResults.forEach((r, idx) => {
            if (r.status === 'fulfilled' && r.value.length > 0) {
              allResults.push(...r.value)
              if (cacheEnabled.value) cache.set(batch[idx], r.value)
            } else {
              failed.push(batch[idx])
            }
          })
          results.value = [...allResults]
          if (i + BATCH_SIZE < kws.length) await delay(BATCH_DELAY)
        }
        return failed
      }

      if (useDefault) {
        // Default: cssn first, then bzsou for failures, then gongbiaoku, then csres
        add('plan: cssn → bzsou (fail) → gongbiaoku (fail) → csres (fallback)', 'info')

        // Phase 1: CSSN
        const failedAfterCssn = await runSource('cssn.net.cn', cssn, uncachedKeywords)

        // Phase 2: bzsou for keywords cssn didn't find
        const failedAfterBzsou = await runSource('bzsou.cn', bzsou, failedAfterCssn)

        // Phase 3: gongbiaoku for keywords bzsou didn't find
        const failedAfterGong = await runSource('gongbiaoku.com', gongbiaoku, failedAfterBzsou)

        // Phase 4: csres for remaining
        if (failedAfterGong.length > 0) {
          await runSource('csres.com', csres, failedAfterGong)
        }
      } else {
        // Single source: query that source, csres as fallback
        const sourceMap: Record<string, { query: (kw: string) => Promise<StandardResult[]> }> = {
          cssn,
          bzsou,
          gongbiaoku,
          csres,
        }

        const selectedSrc = sourceMap[source]
        if (!selectedSrc) {
          add('unknown source: ' + source, 'error')
          running.value = false
          return
        }

        const failed = await runSource(source, selectedSrc, uncachedKeywords)

        // CSRes fallback (unless csres was selected)
        if (source !== 'csres' && failed.length > 0) {
          add(SEPARATOR, 'info')
          add('fallback: csres.com (' + failed.length + ' items)', 'warn')
          await runSource('csres.com', csres, failed)
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    progress.value = { current: normalizedKws.length, total: normalizedKws.length, pct: 100 }

    updateStats({
      time: parseFloat(elapsed),
      queries: normalizedKws.length,
    })

    add(SEPARATOR, 'info')
    add('═══ COMPLETE: ' + results.value.length + ' results, ' + elapsed + 's ═══', 'highlight')

    if (!cacheEnabled.value) {
      cacheEnabled.value = true
      add('cache: enabled for next query', 'info')
    }

    if (cacheEnabled.value) {
      add('cache: ' + cache.size() + ' entries', 'info')
    }

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
