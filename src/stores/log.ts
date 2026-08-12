import type { LogEntry, LogStats, LogType } from '../types'
import { defineStore } from 'pinia'

export const useLogStore = defineStore('log', {
  state: () => ({
    lines: [] as LogEntry[],
    stats: { ok: 0, empty: 0, time: 0, queries: 0 } as LogStats,
  }),
  actions: {
    now(): string {
      return new Date().toLocaleTimeString('zh-CN', { hour12: false })
    },
    add(message: string, type: LogType = 'info') {
      this.lines.push({ time: this.now(), message, type })
      if (type === 'success')
        this.stats.ok++
      if (type === 'warn')
        this.stats.empty++
    },
    updateStats(patch: Partial<LogStats>) {
      Object.assign(this.stats, patch)
    },
    clear() {
      this.lines = []
      this.stats = { ok: 0, empty: 0, time: 0, queries: 0 }
    },
  },
})
