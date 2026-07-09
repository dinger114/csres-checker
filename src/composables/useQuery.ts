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

const SEPARATOR = '────────────────────────────────'

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

    // Deduplicate keywords for querying
    const uniqueKws = [...new Set(normalizedKws)]
    const kwToIndices = new Map<string, number[]>()
    normalizedKws.forEach((kw, idx) => {
      if (!kwToIndices.has(kw)) kwToIndices.set(kw, [])
      kwToIndices.get(kw)!.push(idx)
    })

    if (uniqueKws.length > 0) {
      const queryResults = new Map<string, StandardResult[]>()

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
            const kw = batch[idx]
            if (r.status === 'fulfilled' && r.value.length > 0) {
              queryResults.set(kw, r.value)
            } else {
              failed.push(kw)
            }
          })
          // Rebuild results from queryResults
          const allResults: StandardResult[] = []
          for (const [kw2, queryResult] of queryResults) {
            const indices = kwToIndices.get(kw2) || []
            for (const idx of indices) {
              allResults.push(...queryResult.map((r) => ({ ...r, query: normalizedKws[idx] })))
            }
          }
          results.value = allResults
          if (i + BATCH_SIZE < kws.length) await delay(BATCH_DELAY)
        }
        return failed
      }

      if (useDefault) {
        add('plan: cssn → bzsou (fail) → gongbiaoku (fail) → csres (fallback)', 'info')

        const failedAfterCssn = await runSource('cssn.net.cn', cssn, uncachedKeywords)
        const failedAfterBzsou = await runSource('bzsou.cn', bzsou, failedAfterCssn)
        const failedAfterGong = await runSource('gongbiaoku.com', gongbiaoku, failedAfterBzsou)

        if (failedAfterGong.length > 0) {
          await runSource('csres.com', csres, failedAfterGong)
        }
      } else {
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

    incQueryCount()
    running.value = false
  }

  async function searchByName(keywords: string[], source: string = '') {
    if (running.value) return
    running.value = true
    results.value = []
    progress.value = { current: 0, total: keywords.length, pct: 0 }

    const startTime = Date.now()
    const normalizedKws = keywords.map(normalizeKeyword).filter(Boolean)

    if (normalizedKws.length === 0) {
      add('请输入标准名称关键词', 'warn')
      running.value = false
      return
    }

    add('═══ NAME SEARCH: ' + normalizedKws.length + ' items ═══', 'highlight')
    add(SEPARATOR, 'info')
    add('plan: cssn.net.cn only', 'info')
    add(SEPARATOR, 'info')

    // Deduplicate keywords
    const uniqueKws = [...new Set(normalizedKws)]
    const kwToIndices = new Map<string, number[]>()
    normalizedKws.forEach((kw, idx) => {
      if (!kwToIndices.has(kw)) kwToIndices.set(kw, [])
      kwToIndices.get(kw)!.push(idx)
    })

    const queryResults = new Map<string, StandardResult[]>()

    for (let i = 0; i < uniqueKws.length; i += BATCH_SIZE) {
      const batch = uniqueKws.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.allSettled(batch.map((kw) => cssn.queryByName(kw)))
      batchResults.forEach((r, idx) => {
        const kw = batch[idx]
        if (r.status === 'fulfilled' && r.value.length > 0) {
          queryResults.set(kw, r.value)
        }
      })
      // Rebuild results
      const rebuilt: StandardResult[] = []
      for (const [kw, qr] of queryResults) {
        const indices = kwToIndices.get(kw) || []
        for (const idx of indices) {
          rebuilt.push(...qr.map((r) => ({ ...r, query: normalizedKws[idx] })))
        }
      }
      results.value = rebuilt
      progress.value = { current: Math.min(i + BATCH_SIZE, uniqueKws.length), total: uniqueKws.length, pct: Math.round(Math.min(i + BATCH_SIZE, uniqueKws.length) / uniqueKws.length * 100) }
      if (i + BATCH_SIZE < uniqueKws.length) await delay(BATCH_DELAY)
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    progress.value = { current: uniqueKws.length, total: uniqueKws.length, pct: 100 }

    updateStats({
      time: parseFloat(elapsed),
      queries: normalizedKws.length,
    })

    add(SEPARATOR, 'info')
    add('═══ COMPLETE: ' + results.value.length + ' results, ' + elapsed + 's ═══', 'highlight')

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
    query,
    searchByName,
  }
}
