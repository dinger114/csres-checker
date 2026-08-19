import type { Column } from 'write-excel-file/browser'
import type { ColumnDef } from '../components/ResultsTable.vue'
import type { StandardResult } from '../types'
import { COLUMN_MAP } from '../utils/exportConfig'

const DEFAULT_COLUMNS: Column<StandardResult>[] = [
  { header: '查询词', cell: r => ({ value: r.query }), width: 12 },
  { header: '标准号', cell: r => ({ value: r.standard_number }), width: 18 },
  { header: '名称', cell: r => ({ value: r.title }), width: 40 },
  { header: '状态', cell: r => ({ value: r.status }), width: 8 },
  { header: '发布日期', cell: r => ({ value: r.publish_date }), width: 12 },
  { header: '实施日期', cell: r => ({ value: r.implement_date }), width: 12 },
  { header: '替代标准', cell: r => ({ value: r.replaced_by }), width: 18 },
]

export function useXlsx() {
  async function exportXlsx(results: StandardResult[], columns?: ColumnDef[]) {
    // write-excel-file is loaded only when the user actually exports
    const { default: writeExcelFile } = await import('write-excel-file/browser')

    const exportCols = (columns || []).filter(c => c.exportable)
    const cols: Column<StandardResult>[] = exportCols.length > 0
      ? exportCols.map(c => ({
          header: COLUMN_MAP[c.key]?.label || c.label,
          cell: (r: StandardResult): { value: string } => {
            const field = COLUMN_MAP[c.key]?.field || c.key
            const value = r[field as keyof StandardResult]
            return { value: value == null ? '' : String(value) }
          },
          width: COLUMN_MAP[c.key]?.width || 15,
        }))
      : DEFAULT_COLUMNS

    await writeExcelFile(results, { columns: cols }).toFile('csres-results.xlsx')
  }

  return { exportXlsx }
}
