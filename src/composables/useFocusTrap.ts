import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

// 轻量焦点陷阱：弹窗打开时聚焦容器，Tab/Shift+Tab 循环在可聚焦元素内
export function useFocusTrap(active: () => boolean) {
  const container = ref<HTMLElement | null>(null)
  let prevFocus: HTMLElement | null = null

  function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Tab' || !container.value)
      return
    const focusables = container.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusables.length === 0)
      return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    }
    else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  watch(active, (val) => {
    if (val) {
      prevFocus = document.activeElement as HTMLElement | null
      document.addEventListener('keydown', onKeydown)
      nextTick(() => container.value?.focus())
    }
    else {
      document.removeEventListener('keydown', onKeydown)
      prevFocus?.focus()
    }
  })

  onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

  return { container }
}
