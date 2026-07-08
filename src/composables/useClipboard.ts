import type { ColumnDef } from '../components/ResultsTable.vue'

const COLUMN_MAP: Record<string, { label: string; field: string }> = {
  query: { label: '查询词', field: 'query' },
  standard_number: { label: '标准号', field: 'standard_number' },
  title: { label: '名称', field: 'title' },
  status: { label: '状态', field: 'status' },
  publish_date: { label: '发布日期', field: 'publish_date' },
  implement_date: { label: '实施日期', field: 'implement_date' },
}

export function useClipboard() {
  async function copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }

  function exportMarkdown(results: Array<Record<string, string>>, columns?: ColumnDef[]): string {
    if (results.length === 0) return ''

    const exportCols = (columns || []).filter((c) => c.exportable)
    if (exportCols.length === 0) {
      // Fallback to default
      const headers = ['标准号', '名称', '状态', '发布日期', '实施日期']
      const rows = results.map((r) => [
        r.standard_number || '',
        r.title || '',
        r.status || '',
        r.publish_date || '',
        r.implement_date || '',
      ])
      return [
        '| ' + headers.join(' | ') + ' |',
        '| ' + headers.map(() => '---').join(' | ') + ' |',
        ...rows.map((row) => '| ' + row.join(' | ') + ' |'),
      ].join('\n')
    }

    const headers = exportCols.map((c) => COLUMN_MAP[c.key]?.label || c.label)
    const rows = results.map((r) =>
      exportCols.map((c) => (r as any)[COLUMN_MAP[c.key]?.field || c.key] || '')
    )

    return [
      '| ' + headers.join(' | ') + ' |',
      '| ' + headers.map(() => '---').join(' | ') + ' |',
      ...rows.map((row) => '| ' + row.join(' | ') + ' |'),
    ].join('\n')
  }

  return { copy, exportMarkdown }
}
