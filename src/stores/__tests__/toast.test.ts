import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToastStore } from '../toast'

describe('useToastStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a message and sets visible', () => {
    const toast = useToastStore()
    toast.show('已复制')
    expect(toast.visible).toBe(true)
    expect(toast.message).toBe('已复制')
  })

  it('auto-hides after the default duration', () => {
    const toast = useToastStore()
    toast.show('已复制')
    vi.advanceTimersByTime(2000)
    expect(toast.visible).toBe(false)
  })

  it('replaces the message and resets the timer on repeated shows', () => {
    const toast = useToastStore()
    toast.show('第一条', 5000)
    vi.advanceTimersByTime(1000)
    toast.show('第二条', 1000)
    vi.advanceTimersByTime(2000)
    // 第二条的 1000ms 已过，应隐藏
    expect(toast.visible).toBe(false)
    expect(toast.message).toBe('第二条')
  })
})
