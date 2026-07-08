import * as XLSX from 'xlsx'
import type { StandardResult } from '../types'
import type { ColumnDef } from '../components/ResultsTable.vue'

const COLUMN_MAP: Record<string, { label: string; field: string; width: number }> = {
  query: { label: '查询词', field: 'query', width: 12 },
  standard_number: { label: '标准号', field: 'standard_number', width: 18 },
  title: { label: '名称', field: 'title', width: 40 },
  status: { label: '状态', field: 'status', width: 8 },
  publish_date: { label: '发布日期', field: 'publish_date', width: 12 },
  implement_date: { label: '实施日期', field: 'implement_date', width: 12 },
  replaced_by: { label: '替代标准', field: 'replaced_by', width: 18 },
}

export function useXlsx() {
  function exportXlsx(results: StandardResult[], columns?: ColumnDef[]) {
    const exportCols = (columns || []).filter((c) => c.exportable)

    // Fallback to default if no columns
    if (exportCols.length === 0) {
      const rows = results.map((r) => ({
        '查询词': r.query,
        '标准号': r.standard_number,
        '名称': r.title,
        '状态': r.status,
        '发布日期': r.publish_date,
        '实施日期': r.implement_date,
        '替代标准': r.replaced_by,
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 40 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 18 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '标准查询结果')
      XLSX.writeFile(wb, 'csres-results.xlsx')
      return
    }

    // Build rows with column order
    const headers = exportCols.map((c) => COLUMN_MAP[c.key]?.label || c.label)
    const widths = exportCols.map((c) => ({ wch: COLUMN_MAP[c.key]?.width || 15 }))
    const rows = results.map((r) => {
      const row: Record<string, string> = {}
      exportCols.forEach((c) => {
        const field = COLUMN_MAP[c.key]?.field || c.key
        row[COLUMN_MAP[c.key]?.label || c.label] = (r as any)[field] || ''
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
