import type { StandardResult } from '../types'

const CQDB_BASE = 'http://183.66.41.2:3757/x/'

export function parseCqDbHtml(html: string, keyword: string): StandardResult[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const results: StandardResult[] = []

  doc.querySelectorAll('table.layui-table tbody tr').forEach((tr) => {
    const tds = tr.querySelectorAll('td')
    if (tds.length < 11) return

    const standard_number = tds[0]?.textContent?.trim() || ''
    if (!standard_number) return

    const pdfAnchor = tds[10]?.querySelector('a')
    const pdfHref = pdfAnchor?.getAttribute('href') || ''
    const pdf_url = pdfHref ? CQDB_BASE + pdfHref.replace(/^\/+/, '') : ''

    results.push({
      query: keyword,
      standard_number,
      title: tds[1]?.textContent?.trim() || '',
      status: tds[4]?.textContent?.trim() || '',
      publish_date: tds[2]?.textContent?.trim() || '',
      implement_date: tds[3]?.textContent?.trim() || '',
      replaced_by: tds[6]?.textContent?.trim() || '',
      publisher: tds[7]?.textContent?.trim() || '',
      category: '',
      ics: '',
      pdf_url,
    })
  })

  return results
}

export function parseGongbiaokuHtml(html: string, keyword: string): StandardResult[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const results: StandardResult[] = []

  doc.querySelectorAll('ul.box-list > li').forEach((li) => {
    const ni = li.querySelector('ul.name-intr')
    if (!ni) return

    const info: Record<string, string> = {}
    ni.querySelectorAll('li').forEach((item) => {
      const span = item.querySelector('span')
      if (span) {
        const k = span.textContent.trim().replace(/[：:]$/, '')
        info[k] = item.textContent.replace(span.textContent, '').trim()
      }
    })

    const st = li.querySelector('span.label-xx, span.label-fz')
    let pd = info['发布日期'] || ''
    let id = info['实施日期'] || ''
    const dd = li.querySelector('div.date')
    if (!pd && dd) {
      dd.querySelectorAll('span').forEach((s) => {
        const t = s.textContent
        if (t.includes('发布日期')) pd = t.replace('发布日期：', '').trim()
        else if (t.includes('实施日期')) id = t.replace('实施日期：', '').trim()
      })
    }

    let replaced_by = ''
    const fullText = li.textContent
    const replaceMatch = fullText.match(/被以下标准替代[：:]\s*([A-Za-z\/]+\s*\d+[\-\s]?\d*)/)
    if (replaceMatch) {
      replaced_by = replaceMatch[1].trim()
    }

    const standard_number = info['标准编号'] || ''
    if (standard_number) {
      results.push({
        query: keyword,
        standard_number,
        title: info['标准名称'] || '',
        status: st ? st.textContent.trim() : '',
        publish_date: pd,
        implement_date: id,
        replaced_by,
        publisher: '',
        category: '',
        ics: '',
      })
    }
  })

  return results
}

export function parseCsresHtml(html: string, keyword: string): StandardResult[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const rows = doc.querySelectorAll('tr[bgcolor="#FFFFFF"], tr[bgcolor="#DADAFF"]')
  const results: StandardResult[] = []

  rows.forEach((tr) => {
    const tds = tr.querySelectorAll('td')
    if (tds.length < 5) return

    const titleAttr = tr.getAttribute('title') || ''
    const info: Record<string, string> = {}
    titleAttr.split('\n').forEach((line) => {
      if (line.includes('：')) {
        const [k, ...v] = line.split('：')
        info[k.trim()] = v.join('：').trim()
      }
    })

    results.push({
      query: keyword,
      standard_number: tds[0]?.textContent?.trim().replace(/^\s/, '') || '',
      title: tds[1]?.textContent?.trim().replace(/^\s/, '') || '',
      status: tds[4]?.textContent?.trim().replace(/^\s/, '') || '',
      publish_date: info['发布日期'] || '',
      implement_date: info['实施日期'] || '',
      replaced_by: '',
      publisher: '',
      category: '',
      ics: '',
    })
  })

  // Fix: if multiple versions exist, older ones marked as 现行 should be 被代替
  if (results.length > 1) {
    // Group by base number (without year)
    const groups = new Map<string, typeof results>()
    results.forEach((r) => {
      const base = r.standard_number.replace(/[-–]\d{4}.*$/, '').replace(/\s/g, '')
      if (!groups.has(base)) groups.set(base, [])
      groups.get(base)!.push(r)
    })

    // For each group with multiple versions, mark older ones as 被代替
    for (const [, group] of groups) {
      if (group.length <= 1) continue
      // Filter out English versions (ending with E) for determining the latest
      const chineseVersions = group.filter((r) => !r.standard_number.endsWith('E'))
      if (chineseVersions.length <= 1) continue
      // Sort by standard number descending (newer first)
      chineseVersions.sort((a, b) => b.standard_number.localeCompare(a.standard_number))
      const latest = chineseVersions[0]
      for (let i = 1; i < chineseVersions.length; i++) {
        if (chineseVersions[i].status === '现行') {
          chineseVersions[i].status = '被代替'
          chineseVersions[i].replaced_by = latest.standard_number
        }
      }
    }
  }

  return results
}
