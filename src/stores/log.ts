import type { LogEntry, LogStats, LogType } from '../types'
import { defineStore } from 'pinia'

const MAX_LOG_LINES = 200

export const useLogStore = defineStore('log', {
  state: () => ({
    lines: [] as LogEntry[],
    stats: { ok: 0, empty: 0, warnings: 0, time: 0, queries: 0 } as LogStats,
  }),
  actions: {
    now(): string {
      return new Date().toLocaleTimeString('zh-CN', { hour12: false })
    },
    add(message: string, type: LogType = 'info') {
      this.lines.push({ time: this.now(), message, type })
      if (type === 'success')
        this.stats.ok++
      // C11: warn 仅表告警,不再污染 empty 计数;empty 由 recordEmpty() 显式累加
      if (type === 'warn')
        this.stats.warnings++
      // Trim to max lines to prevent memory buildup during batch queries
      if (this.lines.length > MAX_LOG_LINES) {
        this.lines = this.lines.slice(-MAX_LOG_LINES)
      }
    },
    // C11: 显式记录「空结果」,与 warn 语义分离;count 便于批量路径一次累计
    recordEmpty(count = 1) {
      this.stats.empty += count
    },
    updateStats(patch: Partial<LogStats>) {
      Object.assign(this.stats, patch)
    },
    clear() {
      this.lines = []
      this.stats = { ok: 0, empty: 0, warnings: 0, time: 0, queries: 0 }
    },
  },
})
