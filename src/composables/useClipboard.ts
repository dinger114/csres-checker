import type { ColumnDef } from '../components/ResultsTable.vue'
import type { StandardResult } from '../types'
import { COLUMN_MAP } from '../utils/exportConfig'

export function useClipboard() {
  async function copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      return true
    }
    catch {
      return false
    }
  }

  function exportMarkdown(results: StandardResult[], columns?: ColumnDef[]): string {
    if (results.length === 0)
      return ''

    const exportCols = (columns || []).filter(c => c.exportable)
    if (exportCols.length === 0) {
      // Fallback to default
      const headers = ['标准号', '名称', '状态', '发布日期', '实施日期']
      const rows = results.map(r => [
        r.standard_number || '',
        r.title || '',
        r.status || '',
        r.publish_date || '',
        r.implement_date || '',
      ])
      return [
        `| ${headers.join(' | ')} |`,
        `| ${headers.map(() => '---').join(' | ')} |`,
        ...rows.map(row => `| ${row.join(' | ')} |`),
      ].join('\n')
    }

    const headers = exportCols.map(c => COLUMN_MAP[c.key]?.label || c.label)
    const rows = results.map(r =>
      exportCols.map((c) => {
        const field = COLUMN_MAP[c.key]?.field || c.key
        const value = r[field as keyof StandardResult]
        return value == null ? '' : String(value)
      }),
    )

    return [
      `| ${headers.join(' | ')} |`,
      `| ${headers.map(() => '---').join(' | ')} |`,
      ...rows.map(row => `| ${row.join(' | ')} |`),
    ].join('\n')
  }

  return { copy, exportMarkdown }
}
