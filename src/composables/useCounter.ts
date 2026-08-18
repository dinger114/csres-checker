import { ref } from 'vue'
import { useLogStore } from '../stores/log'

const globalCount = ref(0)

// 两个 Pages 站（GitHub Pages / Cloudflare Pages）共用同一个 Worker 计数后端。
// workers.dev 域名在大陆无法访问，使用自定义域名 counter.dingyi.de。
// 构建期可通过 VITE_WORKER_URL 覆盖。
const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://counter.dingyi.de'

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

  // n = 本次成功查询的关键词数（≥1 才调用）。Worker 端会把 KV 计数 +n。
  async function incQueryCount(n: number = 1) {
    if (n <= 0)
      return
    try {
      const resp = await fetch(`${WORKER_URL}/api/count/inc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ n }),
      })
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
