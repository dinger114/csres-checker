import type { ProgressState, StandardResult } from '../types'
import { defineStore } from 'pinia'
import { useAtlas } from '../composables/useAtlas'
import { useBzsou } from '../composables/useBzsou'
import { useCcsn } from '../composables/useCcsn'
import { useClipboard } from '../composables/useClipboard'
import { useCounter } from '../composables/useCounter'
import { useCqdb } from '../composables/useCqdb'
import { useCsres } from '../composables/useCsres'
import { useCssn } from '../composables/useCssn'
import { useGongbiaoku } from '../composables/useGongbiaoku'
import { useXlsx } from '../composables/useXlsx'
import { BATCH_DELAY, BATCH_SIZE } from '../utils/constants'
import { normalizeKeyword } from '../utils/normalize'
import { useLogStore } from './log'
import { useToastStore } from './toast'
import { useUIStore } from './ui'

const SEPARATOR = '────────────────────────────────'

interface SourceFn { query: (kw: string) => Promise<StandardResult[]> }

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

export const useQueryStore = defineStore('query', {
  state: () => ({
    results: [] as StandardResult[],
    progress: { current: 0, total: 0, pct: 0 } as ProgressState,
    running: false,
    // 自适应批量控制：按近期单次查询耗时动态调整并发度与间隔
    latencyWindow: [] as number[],
    fastThreshold: 800,
    slowThreshold: 2500,
    maxBatch: 4,
    minBatch: 1,
  }),
  actions: {
    recordLatency(ms: number) {
      this.latencyWindow.push(ms)
      if (this.latencyWindow.length > 10)
        this.latencyWindow.shift()
    },
    avgLatency(): number {
      if (this.latencyWindow.length === 0)
        return 0
      return this.latencyWindow.reduce((a, b) => a + b, 0) / this.latencyWindow.length
    },
    adaptiveBatchSize(): number {
      const avg = this.avgLatency()
      if (avg > this.slowThreshold)
        return this.minBatch
      if (avg > this.fastThreshold)
        return BATCH_SIZE
      return this.maxBatch
    },
    adaptiveDelay(): number {
      const avg = this.avgLatency()
      if (avg > this.slowThreshold)
        return BATCH_DELAY * 2
      if (avg > this.fastThreshold)
        return BATCH_DELAY
      return Math.max(150, Math.round(BATCH_DELAY / 2))
    },
    async runSource(
      name: string,
      src: SourceFn,
      kws: string[],
      normalizedKws: string[],
      kwToIndices: Map<string, number[]>,
      queryResults: Map<string, StandardResult[]>,
    ): Promise<string[]> {
      const { add } = useLogStore()
      if (kws.length === 0)
        return []
      add(SEPARATOR, 'info')
      add(`phase: ${name} (${kws.length} items)`, 'info')

      const failed: string[] = []
      for (let i = 0; i < kws.length; i += this.adaptiveBatchSize()) {
        const batch = kws.slice(i, i + this.adaptiveBatchSize())
        const t0 = Date.now()
        const batchResults = await Promise.allSettled(batch.map(kw => src.query(kw)))
        this.recordLatency((Date.now() - t0) / batch.length)
        batchResults.forEach((r, idx) => {
          const kw = batch[idx]
          if (r.status === 'fulfilled' && r.value.length > 0) {
            if (!queryResults.has(kw)) {
              // New keyword — append results incrementally
              const indices = kwToIndices.get(kw) || []
              for (const idx of indices) {
                this.results.push(...r.value.map(res => ({ ...res, query: normalizedKws[idx] })))
              }
            }
            queryResults.set(kw, r.value)
          }
          else {
            failed.push(kw)
          }
        })
        if (i + this.adaptiveBatchSize() < kws.length)
          await delay(this.adaptiveDelay())
      }
      return failed
    },
    async query(keywords: string[], source: string = '') {
      const { add, updateStats } = useLogStore()
      if (this.running)
        return
      this.running = true
      this.results = []
      this.progress = { current: 0, total: keywords.length, pct: 0 }

      const startTime = Date.now()
      const normalizedKws = keywords.map(normalizeKeyword).filter(Boolean)
      const useDefault = source === ''

      if (normalizedKws.length === 0) {
        add('请输入标准编号', 'warn')
        this.running = false
        return
      }

      add(`═══ START: ${normalizedKws.length} items ═══`, 'highlight')

      if (!useDefault) {
        add(`selected: ${source}`, 'info')
      }
      add(SEPARATOR, 'info')

      // Deduplicate keywords for querying
      const uniqueKws = [...new Set(normalizedKws)]
      const kwToIndices = new Map<string, number[]>()
      normalizedKws.forEach((kw, idx) => {
        if (!kwToIndices.has(kw))
          kwToIndices.set(kw, [])
        kwToIndices.get(kw)!.push(idx)
      })

      // 记录每个关键词是否命中（任一源返回 ≥1 条即记一次）。
      // 完成后用 queryResults.size 作为「成功查询关键词数」上报计数。
      const queryResults = new Map<string, StandardResult[]>()

      if (uniqueKws.length > 0) {
        if (useDefault) {
          add('plan: cssn → bzsou (fail) → ccsn (fail) → gongbiaoku (fail) → csres (fallback)', 'info')

          const { query: cssnQuery } = useCssn()
          const { query: bzsouQuery } = useBzsou()
          const { query: ccsnQuery } = useCcsn()
          const { query: gongQuery } = useGongbiaoku()
          const { query: csresQuery } = useCsres()

          const failedAfterCssn = await this.runSource('cssn.net.cn', { query: cssnQuery }, uniqueKws, normalizedKws, kwToIndices, queryResults)
          const failedAfterBzsou = await this.runSource('bzsou.cn', { query: bzsouQuery }, failedAfterCssn, normalizedKws, kwToIndices, queryResults)
          const failedAfterCcsn = await this.runSource('ccsn.org.cn', { query: ccsnQuery }, failedAfterBzsou, normalizedKws, kwToIndices, queryResults)
          const failedAfterGong = await this.runSource('gongbiaoku.com', { query: gongQuery }, failedAfterCcsn, normalizedKws, kwToIndices, queryResults)

          if (failedAfterGong.length > 0) {
            await this.runSource('csres.com', { query: csresQuery }, failedAfterGong, normalizedKws, kwToIndices, queryResults)
          }
        }
        else {
          const { query: cssnQuery } = useCssn()
          const { query: bzsouQuery } = useBzsou()
          const { query: ccsnQuery } = useCcsn()
          const { query: gongQuery } = useGongbiaoku()
          const { query: csresQuery } = useCsres()
          const { query: cqdbQuery } = useCqdb()

          const sourceMap: Record<string, SourceFn> = {
            cssn: { query: cssnQuery },
            bzsou: { query: bzsouQuery },
            ccsn: { query: ccsnQuery },
            gongbiaoku: { query: gongQuery },
            csres: { query: csresQuery },
            cqdb: { query: cqdbQuery },
          }

          const selectedSrc = sourceMap[source]
          if (!selectedSrc) {
            add(`unknown source: ${source}`, 'error')
            this.running = false
            return
          }

          const failed = await this.runSource(source, selectedSrc, uniqueKws, normalizedKws, kwToIndices, queryResults)

          if (source !== 'csres' && failed.length > 0) {
            add(SEPARATOR, 'info')
            add(`fallback: csres.com (${failed.length} items)`, 'warn')
            await this.runSource('csres.com', { query: csresQuery }, failed, normalizedKws, kwToIndices, queryResults)
          }
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      this.progress = { current: normalizedKws.length, total: normalizedKws.length, pct: 100 }

      // 按命中关键词数上报全网成功查询计数（fire-and-forget，不阻塞 UI）
      const successCount = queryResults.size
      if (successCount > 0)
        useCounter().incQueryCount(successCount)

      updateStats({
        time: Number.parseFloat(elapsed),
        queries: normalizedKws.length,
      })

      add(SEPARATOR, 'info')
      add(`═══ COMPLETE: ${this.results.length} results, ${elapsed}s ═══`, 'highlight')

      this.running = false
    },
    async queryAtlas(keywords: string[]) {
      const { add, updateStats } = useLogStore()
      if (this.running)
        return
      this.running = true
      this.results = []
      this.progress = { current: 0, total: keywords.length, pct: 0 }

      const startTime = Date.now()
      const normalizedKws = keywords.map(kw => normalizeKeyword(kw).replace(/\s+/g, '')).filter(Boolean)

      if (normalizedKws.length === 0) {
        add('请输入图集编号或名称', 'warn')
        this.running = false
        return
      }

      add(`═══ ATLAS QUERY: ${normalizedKws.length} items ═══`, 'highlight')
      add(SEPARATOR, 'info')
      add('plan: ebook.chinabuilding.com.cn (标准图集, 需代理)', 'info')
      add(SEPARATOR, 'info')

      const uniqueKws = [...new Set(normalizedKws)]
      const kwToIndices = new Map<string, number[]>()
      normalizedKws.forEach((kw, idx) => {
        if (!kwToIndices.has(kw))
          kwToIndices.set(kw, [])
        kwToIndices.get(kw)!.push(idx)
      })

      const { query } = useAtlas()
      const queryResults = new Map<string, StandardResult[]>()

      for (let i = 0; i < uniqueKws.length; i += this.adaptiveBatchSize()) {
        const batch = uniqueKws.slice(i, i + this.adaptiveBatchSize())
        const t0 = Date.now()
        const batchResults = await Promise.allSettled(batch.map(kw => query(kw)))
        this.recordLatency((Date.now() - t0) / batch.length)
        batchResults.forEach((r, idx) => {
          const kw = batch[idx]
          if (r.status === 'fulfilled' && r.value.length > 0) {
            if (!queryResults.has(kw)) {
              const indices = kwToIndices.get(kw) || []
              for (const idx of indices) {
                this.results.push(...r.value.map(res => ({ ...res, query: normalizedKws[idx] })))
              }
            }
            queryResults.set(kw, r.value)
          }
        })
        this.progress = { current: Math.min(i + this.adaptiveBatchSize(), uniqueKws.length), total: uniqueKws.length, pct: Math.round(Math.min(i + this.adaptiveBatchSize(), uniqueKws.length) / uniqueKws.length * 100) }
        if (i + this.adaptiveBatchSize() < uniqueKws.length)
          await delay(this.adaptiveDelay())
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      this.progress = { current: uniqueKws.length, total: uniqueKws.length, pct: 100 }

      const successCount = queryResults.size
      if (successCount > 0)
        useCounter().incQueryCount(successCount)

      updateStats({
        time: Number.parseFloat(elapsed),
        queries: normalizedKws.length,
      })

      add(SEPARATOR, 'info')
      add(`═══ COMPLETE: ${this.results.length} results, ${elapsed}s ═══`, 'highlight')

      this.running = false
    },
    async searchByName(keywords: string[], _source: string = '') {
      const { add, updateStats } = useLogStore()
      if (this.running)
        return
      this.running = true
      this.results = []
      this.progress = { current: 0, total: keywords.length, pct: 0 }

      const startTime = Date.now()
      const normalizedKws = keywords.map(normalizeKeyword).filter(Boolean)

      if (normalizedKws.length === 0) {
        add('请输入标准名称关键词', 'warn')
        this.running = false
        return
      }

      add(`═══ NAME SEARCH: ${normalizedKws.length} items ═══`, 'highlight')
      add(SEPARATOR, 'info')
      add('plan: cssn.net.cn only', 'info')
      add(SEPARATOR, 'info')

      // Deduplicate keywords
      const uniqueKws = [...new Set(normalizedKws)]
      const kwToIndices = new Map<string, number[]>()
      normalizedKws.forEach((kw, idx) => {
        if (!kwToIndices.has(kw))
          kwToIndices.set(kw, [])
        kwToIndices.get(kw)!.push(idx)
      })

      const { queryByName } = useCssn()
      const queryResults = new Map<string, StandardResult[]>()

      for (let i = 0; i < uniqueKws.length; i += this.adaptiveBatchSize()) {
        const batch = uniqueKws.slice(i, i + this.adaptiveBatchSize())
        const t0 = Date.now()
        const batchResults = await Promise.allSettled(batch.map(kw => queryByName(kw)))
        this.recordLatency((Date.now() - t0) / batch.length)
        batchResults.forEach((r, idx) => {
          const kw = batch[idx]
          if (r.status === 'fulfilled' && r.value.length > 0) {
            if (!queryResults.has(kw)) {
              const indices = kwToIndices.get(kw) || []
              for (const idx of indices) {
                this.results.push(...r.value.map(res => ({ ...res, query: normalizedKws[idx] })))
              }
            }
            queryResults.set(kw, r.value)
          }
        })
        this.progress = { current: Math.min(i + this.adaptiveBatchSize(), uniqueKws.length), total: uniqueKws.length, pct: Math.round(Math.min(i + this.adaptiveBatchSize(), uniqueKws.length) / uniqueKws.length * 100) }
        if (i + this.adaptiveBatchSize() < uniqueKws.length)
          await delay(this.adaptiveDelay())
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      this.progress = { current: uniqueKws.length, total: uniqueKws.length, pct: 100 }

      const successCount = queryResults.size
      if (successCount > 0)
        useCounter().incQueryCount(successCount)

      updateStats({
        time: Number.parseFloat(elapsed),
        queries: normalizedKws.length,
      })

      add(SEPARATOR, 'info')
      add(`═══ COMPLETE: ${this.results.length} results, ${elapsed}s ═══`, 'highlight')

      this.running = false
    },
    async copyMarkdown() {
      const { exportMarkdown, copy } = useClipboard()
      const toast = useToastStore()
      const columns = useUIStore().currentColumns
      const md = exportMarkdown(this.results, columns)
      if (!md) {
        toast.show('暂无结果可复制')
        return
      }
      toast.show(await copy(md) ? '已复制 Markdown 到剪贴板' : '复制失败')
    },
    async exportExcel() {
      const { exportXlsx } = useXlsx()
      const toast = useToastStore()
      if (this.results.length === 0) {
        toast.show('暂无结果可导出')
        return
      }
      await exportXlsx(this.results, useUIStore().currentColumns)
      toast.show('已导出 Excel 文件')
    },
  },
})
