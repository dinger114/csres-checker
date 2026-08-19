import type { ColumnDef } from '../../components/ResultsTable.vue'
import type { StandardResult } from '../../types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useXlsx } from '../useXlsx'

const writeExcelFile = vi.fn()

vi.mock('write-excel-file/browser', () => ({
  default: (...args: unknown[]) => {
    writeExcelFile(...args)
    return { toFile: vi.fn().mockResolvedValue(undefined) }
  },
}))

const results: StandardResult[] = [
  { query: 'GB 50010', standard_number: 'GB 50010-2010', title: '混凝土结构设计规范', status: '现行', publish_date: '2010-08-18', implement_date: '2011-07-01', replaced_by: '', publisher: '', category: '', ics: '' },
]

describe('useXlsx.exportXlsx', () => {
  beforeEach(() => {
    writeExcelFile.mockClear()
  })

  it('exports with default columns when none selected', async () => {
    const { exportXlsx } = useXlsx()
    await exportXlsx(results)
    const [objects, options] = writeExcelFile.mock.calls[0]
    expect(objects).toBe(results)
    expect(options.columns.map(c => c.header)).toEqual([
      '查询词',
      '标准号',
      '名称',
      '状态',
      '发布日期',
      '实施日期',
      '替代标准',
    ])
    // default cell reads the corresponding field
    expect(options.columns[1].cell(results[0])).toEqual({ value: 'GB 50010-2010' })
  })

  it('respects exportable column selection and order', async () => {
    const { exportXlsx } = useXlsx()
    const selected: ColumnDef[] = [
      { key: 'status', label: 'STATUS', draggable: true, exportable: true },
      { key: 'title', label: 'TITLE', draggable: true, exportable: true },
      { key: 'doc88', label: '道客巴巴', draggable: true, exportable: false },
    ]
    await exportXlsx(results, selected)
    const [objects, options] = writeExcelFile.mock.calls[0]
    expect(objects).toBe(results)
    expect(options.columns.map(c => c.header)).toEqual(['状态', '名称'])
    expect(options.columns[0].cell(results[0])).toEqual({ value: '现行' })
    expect(options.columns[1].cell(results[0])).toEqual({ value: '混凝土结构设计规范' })
  })

  it('falls back to the column label and default width for unknown keys', async () => {
    const { exportXlsx } = useXlsx()
    const selected: ColumnDef[] = [
      { key: 'doc88', label: '道客巴巴', draggable: true, exportable: true },
    ]
    await exportXlsx(results, selected)
    const [, options] = writeExcelFile.mock.calls[0]
    expect(options.columns[0].header).toBe('道客巴巴')
    expect(options.columns[0].width).toBe(15)
    // unknown key has no data, yields empty string
    expect(options.columns[0].cell(results[0])).toEqual({ value: '' })
  })
})
