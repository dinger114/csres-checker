import { ref, computed } from 'vue'
import type { StandardResult, ProgressState } from '../types'
import { BATCH_SIZE } from '../utils/constants'
import { normalizeKeyword } from '../utils/normalize'
import { useCssn } from './useCssn'
import { useGongbiaoku } from './useGongbiaoku'
import { useCsres } from './useCsres'
import { useLog } from './useLog'
import { useFirebase } from './useFirebase'

export function useQuery() {
  const results = ref<StandardResult[]>([])
  const progress = ref<ProgressState>({ current: 0, total: 0, pct: 0 })
  const running = ref(false)

  const cssn = useCssn()
  const gongbiaoku = useGongbiaoku()
  const csres = useCsres()
  const { add, updateStats } = useLog()
  const { incQueryCount } = useFirebase()

  async function query(keywords: string[]) {
    if (running.value) return
    running.value = true
    results.value = []
    progress.value = { current: 0, total: keywords.length, pct: 0 }

    const startTime = Date.now()
    const normalizedKws = [...new Set(keywords.map(normalizeKeyword).filter(Boolean))]

    if (normalizedKws.length === 0) {
      add('请输入标准编号', 'warn')
      running.value = false
      return
    }

    if (normalizedKws.length < keywords.length) {
      add(`去重: ${keywords.length} → ${normalizedKws.length} 个唯一关键词`, 'info')
    }

    add(`═══ START: ${normalizedKws.length} items ═══`, 'highlight')
    add(`phase1: cssn.net.cn (parallel)`, 'info')
    add(`phase2: gongbiaoku.com fallback (parallel)`, 'info')
    add(`phase3: csres.com fallback (parallel)`, 'info')
    add(`────────────────────────────────`, 'info')

    const allResults: StandardResult[] = []
    const emptyKeywords: string[] = []

    // Phase 1: CSSN - parallel batches
    for (let i = 0; i < normalizedKws.length; i += BATCH_SIZE) {
      const batch = normalizedKws.slice(i, i + BATCH_SIZE)
      progress.value = {
        current: Math.min(i + BATCH_SIZE, normalizedKws.length),
        total: normalizedKws.length,
        pct: Math.round((i / normalizedKws.length) * 100),
      }

      const batchResults = await Promise.allSettled(batch.map((kw) => cssn.query(kw)))
      batchResults.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.value.length > 0) {
          allResults.push(...r.value)
        } else {
          emptyKeywords.push(batch[idx])
        }
      })

      results.value = [...allResults]
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
          } else {
            stillEmpty.push(batch[idx])
          }
        })
        results.value = [...allResults]
      }
    }

    // Phase 3: Csres fallback - parallel batches
    if (stillEmpty.length > 0) {
      add(`────────────────────────────────`, 'info')
      add(`phase3: csres.com fallback (${stillEmpty.length} items)`, 'warn')
      for (let i = 0; i < stillEmpty.length; i += BATCH_SIZE) {
        const batch = stillEmpty.slice(i, i + BATCH_SIZE)
        const batchResults = await Promise.allSettled(batch.map((kw) => csres.query(kw)))
        batchResults.forEach((r) => {
          if (r.status === 'fulfilled' && r.value.length > 0) {
            allResults.push(...r.value)
          }
        })
        results.value = [...allResults]
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

    incQueryCount()
    running.value = false
  }

  return {
    results: computed(() => results.value),
    progress: computed(() => progress.value),
    running: computed(() => running.value),
    query,
  }
}
