import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import en from '../../locales/en.json'
import zhCN from '../../locales/zh-CN.json'
import StatusBadge from '../StatusBadge.vue'

const clipboardData = { text: '' }
const writeText = vi.fn(async (text: string) => {
  clipboardData.text = text
})

// Q6: popover 文案已接 i18n(status.replaced_by),测试需挂载真实 i18n 并固定 zh-CN
function makeI18n() {
  return createI18n({
    legacy: false,
    locale: 'zh-CN',
    fallbackLocale: 'en',
    messages: { 'zh-CN': zhCN, en },
  })
}

function mountBadge(props: { status: string, replacedBy?: string }) {
  return mount(StatusBadge, {
    props: { status: props.status, replacedBy: props.replacedBy ?? '' },
    global: { plugins: [createPinia(), makeI18n()] },
  })
}

describe('statusBadge', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders active badge for 现行 status', () => {
    const wrapper = mountBadge({ status: '现行' })
    expect(wrapper.classes()).toContain('badge-active')
    expect(wrapper.text()).toBe('现行')
  })

  it('renders upcoming badge for 即将实施 status', () => {
    const wrapper = mountBadge({ status: '即将实施' })
    expect(wrapper.classes()).toContain('badge-upcoming')
    expect(wrapper.text()).toBe('即将实施')
  })

  it('renders deprecated badge for 废止 status', () => {
    const wrapper = mountBadge({ status: '废止' })
    expect(wrapper.classes()).toContain('badge-deprecated')
    expect(wrapper.text()).toBe('废止')
  })

  it('renders deprecated badge for 被代替 status', () => {
    const wrapper = mountBadge({ status: '被代替' })
    expect(wrapper.classes()).toContain('badge-deprecated')
  })

  it('renders deprecated badge for 作废 status', () => {
    const wrapper = mountBadge({ status: '作废' })
    expect(wrapper.classes()).toContain('badge-deprecated')
  })

  it('does not show popover when replacedBy is empty', () => {
    const wrapper = mountBadge({ status: '废止', replacedBy: '' })
    expect(wrapper.find('.replace-info').exists()).toBe(false)
  })

  it('shows popover when replacedBy is provided and status is abolished', async () => {
    const wrapper = mountBadge({ status: '废止', replacedBy: 'GB 50011-2024' })
    await wrapper.find('.status-badge').trigger('click')
    const popover = wrapper.find('.replace-info')
    expect(popover.exists()).toBe(true)
    expect(popover.text()).toContain('GB 50011-2024')
    expect(popover.text()).toContain('已被')
    expect(popover.text()).toContain('替代')
  })

  it('does not show popover for replacedBy on non-abolished status', async () => {
    const wrapper = mountBadge({ status: '现行', replacedBy: 'GB 50011-2024' })
    expect(wrapper.find('.replace-info').exists()).toBe(false)
    expect(wrapper.find('.badge-wrap').exists()).toBe(false)
  })

  it('copies replacement number on click', async () => {
    const wrapper = mountBadge({ status: '废止', replacedBy: 'GB 50011-2024' })
    await wrapper.find('.status-badge').trigger('click')
    const replaceNumber = wrapper.find('.replace-number')
    expect(replaceNumber.exists()).toBe(true)
    await replaceNumber.trigger('click')
    expect(writeText).toHaveBeenCalledWith('GB 50011-2024')
  })

  it('toggles popover visibility on badge click', async () => {
    const wrapper = mountBadge({ status: '废止', replacedBy: 'GB 50011-2024' })
    expect(wrapper.find('.replace-info').exists()).toBe(false)
    await wrapper.find('.status-badge').trigger('click')
    expect(wrapper.find('.replace-info').exists()).toBe(true)
    await wrapper.find('.status-badge').trigger('click')
    expect(wrapper.find('.replace-info').exists()).toBe(false)
  })
})
