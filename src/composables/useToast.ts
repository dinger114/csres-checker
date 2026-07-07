import { ref } from 'vue'

const visible = ref(false)
const message = ref('')

let timer: ReturnType<typeof setTimeout> | null = null

export function useToast() {
  function show(msg: string, duration = 2000) {
    message.value = msg
    visible.value = true

    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      visible.value = false
    }, duration)
  }

  return {
    visible: () => visible.value,
    message: () => message.value,
    show,
  }
}
