import { ref } from 'vue'

export function useTurnstile() {
  const token = ref('')
  const pending = ref(false)
  const enabled = false

  function init() {
    // Turnstile disabled - not needed for this use case
  }

  function execute(): Promise<string> {
    return Promise.resolve('')
  }

  return { token, pending, enabled, init, execute }
}
