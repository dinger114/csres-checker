export function useClipboard() {
  async function copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }

  function exportMarkdown(results: Array<Record<string, string>>): string {
    if (results.length === 0) return ''

    const headers = ['标准号', '名称', '状态', '发布日期', '实施日期']
    const rows = results.map((r) => [
      r.standard_number || '',
      r.title || '',
      r.status || '',
      r.publish_date || '',
      r.implement_date || '',
    ])

    const md = [
      '| ' + headers.join(' | ') + ' |',
      '| ' + headers.map(() => '---').join(' | ') + ' |',
      ...rows.map((row) => '| ' + row.join(' | ') + ' |'),
    ]

    return md.join('\n')
  }

  return { copy, exportMarkdown }
}
