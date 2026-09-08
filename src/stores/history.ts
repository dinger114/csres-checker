import { defineStore } from 'pinia'

const HISTORY_KEY = 'csres-query-history'
const MAX_HISTORY = 20

function loadHistory(): string[] {
  try {
    const saved = localStorage.getItem(HISTORY_KEY)
    const parsed = saved ? JSON.parse(saved) : []
    // S18: 校验类型,避免 localStorage 脏数据导致 add() 崩溃
    return Array.isArray(parsed) ? parsed.filter((x: unknown): x is string => typeof x === 'string') : []
  }
  catch {
    return []
  }
}

export const useHistoryStore = defineStore('history', {
  state: () => ({
    history: loadHistory(),
  }),
  actions: {
    save() {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history))
    },
    add(keywords: string[]) {
      const entry = keywords.join('\n')
      // Remove duplicate if exists
      const idx = this.history.indexOf(entry)
      if (idx !== -1)
        this.history.splice(idx, 1)
      // Add to front
      this.history.unshift(entry)
      // Trim to max
      if (this.history.length > MAX_HISTORY)
        this.history = this.history.slice(0, MAX_HISTORY)
      this.save()
    },
    remove(index: number) {
      this.history.splice(index, 1)
      this.save()
    },
    clear() {
      this.history = []
      this.save()
    },
  },
})
