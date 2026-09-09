import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

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

  function activate() {
    prevFocus = document.activeElement as HTMLElement | null
    document.addEventListener('keydown', onKeydown)
    nextTick(() => container.value?.focus())
  }

  function deactivate() {
    document.removeEventListener('keydown', onKeydown)
    prevFocus?.focus()
    prevFocus = null
  }

  // C16: immediate 处理初始即激活(如页面加载时弹窗已开)的情况;
  // 初始激活时容器可能尚未挂载,onMounted 再补一次聚焦
  watch(active, (val) => {
    if (val)
      activate()
    else
      deactivate()
  }, { immediate: true })

  onMounted(() => {
    if (active())
      nextTick(() => container.value?.focus())
  })

  onBeforeUnmount(() => {
    // C16: 激活期间宿主组件卸载,同样恢复先前焦点(此前只移除了 keydown 监听)
    if (active())
      deactivate()
    else
      document.removeEventListener('keydown', onKeydown)
  })

  return { container }
}
