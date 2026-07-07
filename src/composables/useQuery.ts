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

  async function runBatch<T>(items: string[], fn: (kw: string) => Promise<T[]>): Promise<Map<string, T[]>> {
    const resultMap = new Map<string, T[]>()

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map(async (kw) => {
          const r = await fn(kw)
          return { kw, r }
        })
      )

      batchResults.forEach(({ kw, r }) => {
        resultMap.set(kw, r)
        progress.value = {
          current: progress.value.current + 1,
          total: progress.value.total,
          pct: Math.round(((progress.value.current + 1) / progress.value.total) * 100),
        }
      })
    }

    return resultMap
  }

  async function query(keywords: string[]) {
    if (running.value) return
    running.value = true
    results.value = []
    progress.value = { current: 0, total: keywords.length * 3, pct: 0 }

    const startTime = Date.now()
    const normalizedKws = keywords.map(normalizeKeyword).filter(Boolean)

    if (normalizedKws.length === 0) {
      add('请输入标准编号', 'warn')
      running.value = false
      return
    }

    add(`开始查询 ${normalizedKws.length} 个标准...`, 'info')

    const allResults = new Map<string, StandardResult[]>()
    const missed: string[] = []

    // Phase 1: CSSN
    add('Phase 1: 查询 CSSN...', 'info')
    const cssnResults = await runBatch(normalizedKws, (kw) => cssn.query(kw))

    cssnResults.forEach((r, kw) => {
      if (r.length > 0) {
        allResults.set(kw, r)
        add(`✓ ${kw}: CSSN 找到 ${r.length} 条`, 'success')
      } else {
        missed.push(kw)
      }
    })

    // Phase 2: GongBiaooku
    if (missed.length > 0) {
      add(`Phase 2: 查询工标库 (${missed.length} 个未命中)...`, 'info')
      const gbResults = await runBatch(missed, (kw) => gongbiaoku.query(kw))
      const stillMissed: string[] = []

      gbResults.forEach((r, kw) => {
        if (r.length > 0) {
          allResults.set(kw, [...(allResults.get(kw) || []), ...r])
          add(`✓ ${kw}: 工标库找到 ${r.length} 条`, 'success')
        } else {
          stillMissed.push(kw)
          add(`○ ${kw}: 工标库无结果`, 'warn')
        }
      })

      // Phase 3: Csres
      if (stillMissed.length > 0) {
        add(`Phase 3: 查询 csres.com (${stillMissed.length} 个未命中)...`, 'info')
        const csresResults = await runBatch(stillMissed, (kw) => csres.query(kw))

        csresResults.forEach((r, kw) => {
          if (r.length > 0) {
            allResults.set(kw, [...(allResults.get(kw) || []), ...r])
            add(`✓ ${kw}: csres 找到 ${r.length} 条`, 'success')
          } else {
            add(`✗ ${kw}: 全部数据源无结果`, 'error')
          }
        })
      }
    }

    // Flatten results in original order
    results.value = normalizedKws.flatMap((kw) => allResults.get(kw) || [])

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const okCount = [...allResults.values()].filter((r) => r.length > 0).length
    const emptyCount = normalizedKws.length - okCount

    updateStats({
      time: parseFloat(elapsed),
      queries: normalizedKws.length,
    })

    add(`查询完成: ${okCount} 个有结果, ${emptyCount} 个无结果, 耗时 ${elapsed}s`, 'highlight')

    // Increment global counter (non-blocking)
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
