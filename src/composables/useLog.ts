import { ref, computed } from 'vue'
import type { LogEntry, LogStats, LogType } from '../types'

const lines = ref<LogEntry[]>([])
const stats = ref<LogStats>({ ok: 0, empty: 0, time: 0, queries: 0 })

export function useLog() {
  function now(): string {
    return new Date().toLocaleTimeString('zh-CN', { hour12: false })
  }

  function add(message: string, type: LogType = 'info') {
    lines.value = [...lines.value, { time: now(), message, type }]
    if (type === 'success') stats.value = { ...stats.value, ok: stats.value.ok + 1 }
    if (type === 'warn') stats.value = { ...stats.value, empty: stats.value.empty + 1 }
  }

  function updateStats(patch: Partial<LogStats>) {
    stats.value = { ...stats.value, ...patch }
  }

  function clear() {
    lines.value = []
    stats.value = { ok: 0, empty: 0, time: 0, queries: 0 }
  }

  return {
    lines: computed(() => lines.value),
    stats: computed(() => stats.value),
    add,
    updateStats,
    clear,
  }
}
