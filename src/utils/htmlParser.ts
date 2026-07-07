import type { StandardResult } from '../types'

export function parseGongbiaokuHtml(html: string, keyword: string): StandardResult[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const items = doc.querySelectorAll('ul.box-list > li')
  const results: StandardResult[] = []

  items.forEach((li) => {
    const nameEl = li.querySelector('.name-intr .label-xx')
    const fzEl = li.querySelector('.name-intr .label-fz')
    const titleEl = li.querySelector('.name')
    const statusEl = li.querySelector('.state')
    const dateEls = li.querySelectorAll('.name-intr span')

    const standard_number = nameEl?.textContent?.trim() || ''
    const title = titleEl?.textContent?.trim() || ''
    const status = statusEl?.textContent?.trim() || ''

    let publish_date = ''
    let implement_date = ''
    dateEls.forEach((span) => {
      const text = span.textContent || ''
      if (text.includes('发布')) publish_date = text.replace(/.*?(\d{4}[-/]\d{1,2}[-/]\d{1,2})/, '$1')
      if (text.includes('实施')) implement_date = text.replace(/.*?(\d{4}[-/]\d{1,2}[-/]\d{1,2})/, '$1')
    })

    const replaced_by = fzEl?.textContent?.trim() || ''

    if (standard_number) {
      results.push({
        query: keyword,
        standard_number,
        title,
        status,
        publish_date,
        implement_date,
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

    const standard_number = tds[0]?.textContent?.trim() || ''
    const title = tds[1]?.textContent?.trim() || ''
    const status = tds[2]?.textContent?.trim() || ''
    const publish_date = tds[3]?.textContent?.trim() || ''
    const implement_date = tds[4]?.textContent?.trim() || ''

    if (standard_number) {
      results.push({
        query: keyword,
        standard_number,
        title,
        status,
        publish_date,
        implement_date,
        replaced_by: '',
        publisher: '',
        category: '',
        ics: '',
      })
    }
  })

  return results
}
