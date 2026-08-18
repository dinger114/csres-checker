import { ref } from 'vue'
import { useLogStore } from '../stores/log'

const globalCount = ref(0)

// 始终使用 workers.dev URL（本地代理没有计数端点）
const WORKER_URL = 'https://csres-proxy.mdzz233.workers.dev'

export function useCounter() {
  const { add } = useLogStore()

  async function refreshCount() {
    try {
      const resp = await fetch(`${WORKER_URL}/api/count`)
      if (!resp.ok)
        throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      globalCount.value = data.count || 0
    }
    catch (e) {
      add(`count refresh error: ${e}`, 'error')
    }
  }

  async function incQueryCount() {
    try {
      const resp = await fetch(`${WORKER_URL}/api/count/inc`, { method: 'POST' })
      if (!resp.ok)
        throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      globalCount.value = data.count
    }
    catch (e) {
      add(`count inc error: ${e}`, 'error')
    }
  }

  return { refreshCount, incQueryCount, globalCount }
}
