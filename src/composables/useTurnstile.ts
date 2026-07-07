import { ref } from 'vue'
import { TURNSTILE_SITE_KEY } from '../utils/constants'

declare global {
  interface Window {
    turnstile?: any
  }
}

export function useTurnstile() {
  const token = ref('')
  const pending = ref(false)
  const enabled = !TURNSTILE_SITE_KEY.includes('Placeholder')

  function init(containerEl: HTMLElement | null) {
    if (!enabled || !window.turnstile || !containerEl) return

    window.turnstile.render(containerEl, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (t: string) => {
        token.value = t
        pending.value = false
      },
    })
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

      if (window.turnstile) {
        pending.value = true
        window.turnstile.execute()
        const check = setInterval(() => {
          if (token.value) {
            clearInterval(check)
            resolve(token.value)
          }
        }, 200)
      } else {
        resolve('')
      }
    })
  }

  return { token, pending, enabled, init, execute }
}
