import type { StandardResult } from '../../types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useClipboard } from '../useClipboard'

const results: StandardResult[] = [
  { query: 'GB 50010', standard_number: 'GB 50010-2010', title: '混凝土结构设计规范', status: '现行', publish_date: '2010-08-18', implement_date: '2011-07-01', replaced_by: '', publisher: '', category: '', ics: '' },
]

describe('useClipboard.exportMarkdown', () => {
  it('returns empty string for no results', () => {
    const { exportMarkdown } = useClipboard()
    expect(exportMarkdown([])).toBe('')
  })

  it('builds a markdown table with default columns', () => {
    const { exportMarkdown } = useClipboard()
    const md = exportMarkdown(results)
    expect(md).toContain('| 标准号 | 名称 | 状态 | 发布日期 | 实施日期 |')
    expect(md).toContain('| GB 50010-2010 | 混凝土结构设计规范 | 现行 | 2010-08-18 | 2011-07-01 |')
  })

  it('respects exportable column selection and order', () => {
    const { exportMarkdown } = useClipboard()
    const md = exportMarkdown(results, [
      { key: 'status', label: 'STATUS', draggable: true, exportable: true },
      { key: 'title', label: 'TITLE', draggable: true, exportable: true },
      { key: 'doc88', label: '道客巴巴', draggable: true, exportable: false },
    ])
    expect(md).toContain('| 状态 | 名称 |')
    expect(md).toContain('| 现行 | 混凝土结构设计规范 |')
    expect(md).not.toContain('道客巴巴')
  })
})

describe('useClipboard.copy', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  it('returns true when clipboard write succeeds', async () => {
    const { copy } = useClipboard()
    expect(await copy('hello')).toBe(true)
  })

  it('returns false when clipboard write fails', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    const { copy } = useClipboard()
    expect(await copy('hello')).toBe(false)
  })
})
