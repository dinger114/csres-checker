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
  const inited = ref(false)
  const { add } = useLog()

  function renderWidget(containerEl: HTMLElement) {
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
        'error-callback': () => {
          token.value = ''
          add('Turnstile: 验证失败', 'error')
        },
      })
      inited.value = true
      add('Turnstile: widget 已初始化', 'success')
    } catch (e: any) {
      add(`Turnstile: render 失败 - ${e.message}`, 'error')
    }
  }

  function init(containerEl: HTMLElement | null) {
    if (!enabled) {
      add('Turnstile: 未配置 site key，跳过', 'warn')
      return
    }
    if (!containerEl) {
      add('Turnstile: 容器元素不存在', 'error')
      return
    }
    if (inited.value) return

    // Script already loaded
    if (window.turnstile) {
      renderWidget(containerEl)
      return
    }

    // Script not loaded yet — poll for it
    add('Turnstile: 等待 script 加载...', 'info')
    const check = setInterval(() => {
      if (window.turnstile) {
        clearInterval(check)
        renderWidget(containerEl)
      }
    }, 200)

    // Stop polling after 15s
    setTimeout(() => {
      clearInterval(check)
      if (!inited.value) {
        add('Turnstile: script 加载超时', 'error')
      }
    }, 15000)
  }

  function execute(): Promise<string> {
    return new Promise((resolve) => {
      if (!enabled) {
        resolve('')
        return
      }
      if (token.value) {
        resolve(token.value)
        return
      }

      pending.value = true

      // Wait for widget to become ready
      const waitForReady = setInterval(() => {
        if (window.turnstile && widgetId.value !== null) {
          clearInterval(waitForReady)
          try {
            window.turnstile.execute(widgetId.value)
          } catch (e: any) {
            add(`Turnstile: execute 失败 - ${e.message}`, 'error')
            pending.value = false
            resolve('')
            return
          }

          // Poll for token
          const check = setInterval(() => {
            if (token.value) {
              clearInterval(check)
              pending.value = false
              resolve(token.value)
            }
          }, 200)

          setTimeout(() => {
            clearInterval(check)
            if (!token.value) {
              pending.value = false
              add('Turnstile: 验证超时，查询被阻止', 'error')
              resolve('')
            }
          }, 10000)
        }
      }, 200)

      // If widget never becomes ready in 15s, block
      setTimeout(() => {
        clearInterval(waitForReady)
        if (!token.value) {
          pending.value = false
          add('Turnstile: 加载失败，查询被阻止', 'error')
          resolve('')
        }
      }, 15000)
    })
  }

  return { token, pending, enabled, init, execute }
}
