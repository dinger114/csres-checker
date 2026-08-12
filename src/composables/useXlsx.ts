import type { ColumnDef } from '../components/ResultsTable.vue'
import type { StandardResult } from '../types'
import { COLUMN_MAP } from '../utils/exportConfig'

export function useXlsx() {
  async function exportXlsx(results: StandardResult[], columns?: ColumnDef[]) {
    // xlsx (~282 kB) is loaded only when the user actually exports
    const XLSX = await import('xlsx')
    const exportCols = (columns || []).filter(c => c.exportable)

    // Fallback to default if no columns
    if (exportCols.length === 0) {
      const rows = results.map(r => ({
        查询词: r.query,
        标准号: r.standard_number,
        名称: r.title,
        状态: r.status,
        发布日期: r.publish_date,
        实施日期: r.implement_date,
        替代标准: r.replaced_by,
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 40 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 18 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '标准查询结果')
      XLSX.writeFile(wb, 'csres-results.xlsx')
      return
    }

    // Build rows with column order
    const widths = exportCols.map(c => ({ wch: COLUMN_MAP[c.key]?.width || 15 }))
    const rows = results.map((r) => {
      const row: Record<string, string> = {}
      exportCols.forEach((c) => {
        const field = COLUMN_MAP[c.key]?.field || c.key
        const value = r[field as keyof StandardResult]
        row[COLUMN_MAP[c.key]?.label || c.label] = value == null ? '' : String(value)
      })
      return row
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = widths

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '标准查询结果')
    XLSX.writeFile(wb, 'csres-results.xlsx')
  }

  return { exportXlsx }
}
