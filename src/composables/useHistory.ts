import { ref } from 'vue'

const HISTORY_KEY = 'csres-query-history'
const MAX_HISTORY = 20

export function useHistory() {
  const history = ref<string[]>(loadHistory())

  function loadHistory(): string[] {
    try {
      const saved = localStorage.getItem(HISTORY_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  }

  function saveHistory() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
  }

  function add(keywords: string[]) {
    const entry = keywords.join('\n')
    // Remove duplicate if exists
    const idx = history.value.indexOf(entry)
    if (idx !== -1) {
      history.value.splice(idx, 1)
    }
    // Add to front
    history.value.unshift(entry)
    // Trim to max
    if (history.value.length > MAX_HISTORY) {
      history.value = history.value.slice(0, MAX_HISTORY)
    }
    saveHistory()
  }

  function remove(index: number) {
    history.value.splice(index, 1)
    saveHistory()
  }

  function clear() {
    history.value = []
    saveHistory()
  }

  return { history, add, remove, clear }
}
