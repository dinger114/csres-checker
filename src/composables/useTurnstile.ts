import { ref } from 'vue'
import { TURNSTILE_SITE_KEY } from '../utils/constants'
import { useLog } from './useLog'

declare global {
  interface Window {
    turnstile?: any
  }
}

export function useTurnstile() {
  const token = ref('')
  const pending = ref(false)
  const enabled = !TURNSTILE_SITE_KEY.includes('Placeholder')
  const widgetId = ref<string | null>(null)
  const { add } = useLog()

  function init(containerEl: HTMLElement | null) {
    if (!enabled) {
      add('Turnstile: 未配置 site key，跳过', 'warn')
      return
    }
    if (!window.turnstile) {
      add('Turnstile: script 未加载', 'warn')
      return
    }
    if (!containerEl) {
      add('Turnstile: 容器元素不存在', 'error')
      return
    }
    try {
      widgetId.value = window.turnstile.render(containerEl, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'auto',
        callback: (t: string) => {
          token.value = t
          pending.value = false
          add('Turnstile: 验证通过', 'success')
        },
        'expired-callback': () => {
          token.value = ''
          add('Turnstile: token 已过期', 'warn')
        },
        'error-callback': (e: any) => {
          token.value = ''
          add('Turnstile: 验证失败', 'error')
        },
      })
      add('Turnstile: widget 已初始化', 'info')
    } catch (e: any) {
      add(`Turnstile: render 失败 - ${e.message}`, 'error')
    }
  }

  function execute(): Promise<string> {
    return new Promise((resolve) => {
      if (!enabled) {
        resolve('')
        return
      }
      // 已有 token 直接返回
      if (token.value) {
        resolve(token.value)
        return
      }
      // CDN 未加载则直接跳过，不阻塞查询
      if (!window.turnstile) {
        add('Turnstile: script 未加载，跳过验证', 'warn')
        resolve('')
        return
      }
      // widget 未创建则跳过
      if (widgetId.value === null) {
        add('Turnstile: widget 未初始化，跳过验证', 'warn')
        resolve('')
        return
      }

      pending.value = true
      try {
        window.turnstile.execute(widgetId.value)
      } catch (e: any) {
        add(`Turnstile: execute 失败 - ${e.message}`, 'error')
        pending.value = false
        resolve('')
        return
      }

      // 轮询等待 token
      const startTime = Date.now()
      const check = setInterval(() => {
        if (token.value) {
          clearInterval(check)
          pending.value = false
          resolve(token.value)
        }
      }, 200)

      // 10s 超时兜底
      setTimeout(() => {
        clearInterval(check)
        if (!token.value) {
          pending.value = false
          add('Turnstile: 验证超时，跳过', 'warn')
          resolve('')
        }
      }, 10000)
    })
  }

  return { token, pending, enabled, init, execute }
}
