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

  async function query(keywords: string[]) {
    if (running.value) return
    running.value = true
    results.value = []
    progress.value = { current: 0, total: keywords.length, pct: 0 }

    const startTime = Date.now()
    const normalizedKws = keywords.map(normalizeKeyword).filter(Boolean)

    if (normalizedKws.length === 0) {
      add('请输入标准编号', 'warn')
      running.value = false
      return
    }

    add(`═══ START: ${normalizedKws.length} items ═══`, 'highlight')
    add(`cache: ${cache.size()} entries`, 'info')
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
      add(`────────────────────────────────`, 'info')
      add(`phase1: cssn.net.cn`, 'info')
      add(`phase2: gongbiaoku.com fallback`, 'info')
      add(`phase3: csres.com fallback`, 'info')
      add(`phase4: bzsou.cn fallback`, 'info')
      add(`────────────────────────────────`, 'info')

      const emptyKeywords: string[] = []

      // Phase 1: CSSN - parallel batches
      for (let i = 0; i < uncachedKeywords.length; i += BATCH_SIZE) {
        const batch = uncachedKeywords.slice(i, i + BATCH_SIZE)
        progress.value = {
          current: Math.min(i + BATCH_SIZE, uncachedKeywords.length),
          total: uncachedKeywords.length,
          pct: Math.round((i / uncachedKeywords.length) * 100),
        }

        const batchResults = await Promise.allSettled(batch.map((kw) => cssn.query(kw)))
        batchResults.forEach((r, idx) => {
          if (r.status === 'fulfilled' && r.value.length > 0) {
            allResults.push(...r.value)
            cache.set(batch[idx], r.value)
          } else {
            emptyKeywords.push(batch[idx])
          }
        })

        results.value = [...allResults]
        if (i + BATCH_SIZE < uncachedKeywords.length) await delay(BATCH_DELAY)
      }

      // Phase 2: GongBiaoKu fallback - parallel batches
      const stillEmpty: string[] = []
      if (emptyKeywords.length > 0) {
        add(`────────────────────────────────`, 'info')
        add(`phase2: gongbiaoku.com fallback (${emptyKeywords.length} items)`, 'warn')
        for (let i = 0; i < emptyKeywords.length; i += BATCH_SIZE) {
          const batch = emptyKeywords.slice(i, i + BATCH_SIZE)
          const batchResults = await Promise.allSettled(batch.map((kw) => gongbiaoku.query(kw)))
          batchResults.forEach((r, idx) => {
            if (r.status === 'fulfilled' && r.value.length > 0) {
              allResults.push(...r.value)
              cache.set(batch[idx], r.value)
            } else {
              stillEmpty.push(batch[idx])
            }
          })
          results.value = [...allResults]
          if (i + BATCH_SIZE < emptyKeywords.length) await delay(BATCH_DELAY)
        }
      }

      // Phase 3: Csres fallback - parallel batches
      const stillEmpty2: string[] = []
      if (stillEmpty.length > 0) {
        add(`────────────────────────────────`, 'info')
        add(`phase3: csres.com fallback (${stillEmpty.length} items)`, 'warn')
        for (let i = 0; i < stillEmpty.length; i += BATCH_SIZE) {
          const batch = stillEmpty.slice(i, i + BATCH_SIZE)
          const batchResults = await Promise.allSettled(batch.map((kw) => csres.query(kw)))
          batchResults.forEach((r, idx) => {
            if (r.status === 'fulfilled' && r.value.length > 0) {
              allResults.push(...r.value)
              cache.set(batch[idx], r.value)
            } else {
              stillEmpty2.push(batch[idx])
            }
          })
          results.value = [...allResults]
          if (i + BATCH_SIZE < stillEmpty.length) await delay(BATCH_DELAY)
        }
      }

      // Phase 4: Bzsou fallback - parallel batches
      if (stillEmpty2.length > 0) {
        add(`────────────────────────────────`, 'info')
        add(`phase4: bzsou.cn fallback (${stillEmpty2.length} items)`, 'warn')
        for (let i = 0; i < stillEmpty2.length; i += BATCH_SIZE) {
          const batch = stillEmpty2.slice(i, i + BATCH_SIZE)
          const batchResults = await Promise.allSettled(batch.map((kw) => bzsou.query(kw)))
          batchResults.forEach((r, idx) => {
            if (r.status === 'fulfilled' && r.value.length > 0) {
              allResults.push(...r.value)
              cache.set(batch[idx], r.value)
            }
          })
          results.value = [...allResults]
          if (i + BATCH_SIZE < stillEmpty2.length) await delay(BATCH_DELAY)
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
