import * as XLSX from 'xlsx'
import type { StandardResult } from '../types'

export function useXlsx() {
  function exportXlsx(results: StandardResult[]) {
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

    ws['!cols'] = [
      { wch: 12 },
      { wch: 18 },
      { wch: 40 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '标准查询结果')
    XLSX.writeFile(wb, 'csres-results.xlsx')
  }

  return { exportXlsx }
}
