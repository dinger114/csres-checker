import type { StandardVersion } from '../../types'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import VersionHistory from '../VersionHistory.vue'

// Mock useFocusTrap composable
vi.mock('../../composables/useFocusTrap', () => ({
  useFocusTrap: () => ({
    container: { value: null },
  }),
}))

// Mock StatusBadge component
vi.mock('../StatusBadge.vue', () => ({
  default: {
    name: 'StatusBadge',
    template: '<span class="status-badge">{{ status }}</span>',
    props: ['status', 'replacedBy'],
  },
}))

const mockVersions: StandardVersion[] = [
  {
    standard_number: 'GB 50010-2010',
    title: '混凝土结构设计规范',
    status: '现行',
    publish_date: '2010-08-18',
    implement_date: '2011-07-01',
  },
  {
    standard_number: 'GB 50010-2002',
    title: '混凝土结构设计规范',
    status: '废止',
    publish_date: '2002-03-01',
    implement_date: '2002-10-01',
  },
]

function mountVersionHistory(props: { visible?: boolean, versions?: StandardVersion[] } = {}) {
  return mount(VersionHistory, {
    props: {
      visible: true,
      versions: mockVersions,
      ...props,
    },
    global: {
      stubs: {
        Teleport: true,
      },
    },
  })
}

describe('versionHistory', () => {
  it('renders nothing when not visible', () => {
    const wrapper = mountVersionHistory({ visible: false })
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })

  it('shows modal when visible', () => {
    const wrapper = mountVersionHistory({ visible: true })
    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    expect(wrapper.find('.modal-box').exists()).toBe(true)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.find('.terminal-header .title').text()).toBe('VERSION HISTORY')
  })

  it('displays version data in table', () => {
    const wrapper = mountVersionHistory({ versions: mockVersions })
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)

    // Check first row
    const firstRow = rows[0]
    expect(firstRow.find('td:nth-child(1)').text()).toBe('GB 50010-2010')
    expect(firstRow.find('td:nth-child(2)').text()).toBe('混凝土结构设计规范')
    expect(firstRow.find('td:nth-child(4)').text()).toBe('2010-08-18')
    expect(firstRow.find('td:nth-child(5)').text()).toBe('2011-07-01')
    expect(firstRow.classes()).toContain('current')

    // Check second row
    const secondRow = rows[1]
    expect(secondRow.find('td:nth-child(1)').text()).toBe('GB 50010-2002')
    expect(secondRow.find('td:nth-child(3)').text()).toBe('废止')
    expect(secondRow.classes()).not.toContain('current')
  })

  it('emits close on button click', async () => {
    const wrapper = mountVersionHistory()
    const closeBtn = wrapper.find('.close-btn')
    await closeBtn.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('shows empty message when versions is empty', () => {
    const wrapper = mountVersionHistory({ versions: [] })
    expect(wrapper.find('.empty').text()).toBe('No version history')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('emits close when clicking overlay', async () => {
    const wrapper = mountVersionHistory()
    const overlay = wrapper.find('.modal-overlay')
    await overlay.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
