import type { StandardResult } from '../types'

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

  return results
}
