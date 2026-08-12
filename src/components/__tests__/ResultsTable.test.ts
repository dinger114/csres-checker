import type { StandardResult } from '../../types'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import ResultsTable from '../ResultsTable.vue'

const results: StandardResult[] = [
  { query: 'GB 50010', standard_number: 'GB 50010-2010', title: '混凝土结构设计规范', status: '现行', publish_date: '2010-08-18', implement_date: '2011-07-01', replaced_by: '', publisher: '', category: '', ics: '' },
  { query: 'GB 50011', standard_number: 'GB 50011-2010', title: '建筑抗震设计规范', status: '废止', publish_date: '2010-05-31', implement_date: '2010-12-01', replaced_by: 'GB 50011-2024', publisher: '', category: '', ics: '' },
  { query: 'GB 50016', standard_number: 'GB 50016-2014', title: '建筑设计防火规范', status: '即将实施', publish_date: '2014-08-27', implement_date: '2015-05-01', replaced_by: '', publisher: '', category: '', ics: '' },
]

function mountTable(loading = false) {
  return mount(ResultsTable, {
    props: { results, loading },
    global: { plugins: [createPinia()] },
  })
}

describe('resultsTable', () => {
  it('renders all rows by default', () => {
    const wrapper = mountTable()
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
  })

  it('filters rows by status', async () => {
    const wrapper = mountTable()
    const filterButtons = wrapper.findAll('.filter-btn')
    const deprecatedBtn = filterButtons.find(b => b.text() === '废止')!
    await deprecatedBtn.trigger('click')
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('GB 50011-2010')
  })

  it('sorts by publish date ascending and descending', async () => {
    const wrapper = mountTable()
    const pubTh = wrapper.findAll('th').find(th => th.text().includes('PUBLISHED'))!
    await pubTh.trigger('click')
    let firstCell = wrapper.findAll('tbody tr')[0].text()
    expect(firstCell).toContain('GB 50011-2010')
    await pubTh.trigger('click')
    firstCell = wrapper.findAll('tbody tr')[0].text()
    expect(firstCell).toContain('GB 50016-2014')
  })

  it('selects a row via checkbox', async () => {
    const wrapper = mountTable()
    const firstCheckbox = wrapper.find('tbody tr input[type="checkbox"]')
    await firstCheckbox.setValue(true)
    expect(wrapper.find('.selected-hint').text()).toContain('1 selected')
  })

  it('shows skeleton when loading and no results', () => {
    const wrapper = mount(ResultsTable, {
      props: { results: [], loading: true },
      global: { plugins: [createPinia()] },
    })
    expect(wrapper.find('.skeleton-wrap').exists()).toBe(true)
  })

  it('emits update:columns with current columns on mount', () => {
    const wrapper = mountTable()
    const emitted = wrapper.emitted('update:columns')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toHaveLength(9)
  })
})
