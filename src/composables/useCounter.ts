import { ref } from 'vue'
import { useLogStore } from '../stores/log'

const globalCount = ref(0)

// 使用现有的代理域名，添加计数 API 端点
const WORKER_URL = import.meta.env.PROD
  ? 'https://api.dingyi.de'
  : 'http://localhost:8787'

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
