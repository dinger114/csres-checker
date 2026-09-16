import type { StandardResult } from '../types'
import { STATUS } from './status'

const CQDB_BASE = 'http://183.66.41.2:3757/x/'

export function parseCqDbHtml(html: string, keyword: string): StandardResult[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const results: StandardResult[] = []

  doc.querySelectorAll('table.layui-table tbody tr').forEach((tr) => {
    const tds = tr.querySelectorAll('td')
    if (tds.length < 11)
      return

    const standard_number = tds[0]?.textContent?.trim() || ''
    if (!standard_number)
      return

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
    if (!ni)
      return

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
        if (t.includes('发布日期'))
          pd = t.replace('发布日期：', '').trim()
        else if (t.includes('实施日期'))
          id = t.replace('实施日期：', '').trim()
      })
    }

    let replaced_by = ''
    const fullText = li.textContent
    const replaceMatch = fullText.match(/被以下标准替代[：:]\s*([A-Z/]+\s*\d+[\-\s]?\d*)/i)
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

export function parseAtlasHtml(html: string, keyword: string): StandardResult[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const results: StandardResult[] = []

  doc.querySelectorAll('.bz_list').forEach((item) => {
    const numberA = item.querySelector('.widthPrencent14 a')
    const nameA = item.querySelector('.widthPrencent28 a')

    // 从每个单元格文本中提取日期值(文本可能带"发布日期："等前缀)
    const dateOf = (label: string): string => {
      for (const el of Array.from(item.children)) {
        const t = el.textContent || ''
        if (t.includes(label)) {
          const m = t.match(/\d{4}-\d{2}-\d{2}/)
          if (m)
            return m[0]
        }
      }
      return ''
    }

    // 状态:优先取 .search-resources 内的 .active 纯文本,否则取该格文本并去掉"资源状态:"前缀
    const activeEl = item.querySelector('.search-resources .active')
    let status = activeEl ? activeEl.textContent?.trim() || '' : ''
    if (!status) {
      const src = item.querySelector('.search-resources')
      status = (src?.textContent?.trim() || '').replace(/^资源状态[：:]\s*/, '')
    }

    const standard_number = numberA?.getAttribute('title')?.trim() || numberA?.textContent?.trim() || ''
    if (!standard_number)
      return

    results.push({
      query: keyword,
      standard_number,
      title: nameA?.getAttribute('title')?.trim() || nameA?.textContent?.trim() || '',
      status,
      publish_date: dateOf('发布日期'),
      implement_date: dateOf('实施日期'),
      replaced_by: '',
      publisher: '',
      category: '标准图集',
      ics: '',
    })
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
    if (tds.length < 5)
      return

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
      if (!groups.has(base))
        groups.set(base, [])
      groups.get(base)!.push(r)
    })

    // For each group with multiple versions, mark older ones as 被代替
    for (const [, group] of groups) {
      if (group.length <= 1)
        continue
      // Filter out English versions (ending with E) for determining the latest
      const chineseVersions = group.filter(r => !r.standard_number.endsWith('E'))
      if (chineseVersions.length <= 1)
        continue
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

// ===== 山西省工程建设地方标准(省住建厅「发布公告」) =====
// 实测事实(2026-09,共核对 5 份公告):
//  - 标准库条目页(…/bzgf/bzk/*.shtml)不含标准编号,编号仅存在于 68MB 全文 PDF 附件内;
//  - 公告页(…/bzgf/bzgg/*.shtml)正文才是编号 / 实施日期 / 替代关系的唯一权威来源;
//  - 正文由 div.trs_editor_view 承载,段落被 Word 粘贴产生的 <span style> 切碎,
//    故先按整段去标签取纯文本再做正则,比逐层选择器稳;
//  - 正文含 U+2002 等 Unicode 空白,统一 \s+ 压缩后再匹配。
// 实测句式(仅替代子句有三态:带全角括号 / 带半角括号 / 不存在):
//  现批准《城市综合管廊工程技术标准》为山西省工程建设地方标准，编号为DBJ04/T389-2026，自2026年9月1日起实施。
//  原《城市综合管廊工程技术标准》（DBJ04/T389-2019）同时废止。
const SHANXI_APPROVE_RE = /现?批准《([^》]+)》为山西省工程建设地方标准[，,]编号为\s*([^，,。；;]+)/
const SHANXI_IMPL_RE = /自\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*起\s*(?:实施|施行)/
// 旧名称可能含半角括号(如「现浇混凝土内置保温体系(SD)应用技术标准」);
// [^》]* 不会跨过书名号,故用贪婪即可;编号形如 DBJ04/T389-2019,按「字母+数字+分隔段」精确描述
const SHANXI_REPLACED_RE = /原《([^》]*)》[（(\s]*([a-z]+\d[\da-z]*(?:[/.-][\da-z]*)*)[\s）)]*同时废止/i

export function parseShanxiAnnouncementHtml(
  html: string,
  opts: { keyword: string, pubDate?: string },
): StandardResult[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const body = doc.querySelector('div.trs_editor_view')
  const text = (body?.textContent || '').replace(/\s+/g, '')
  if (!text)
    return []

  const approve = SHANXI_APPROVE_RE.exec(text)
  if (!approve)
    return []

  const title = approve[1].trim()
  const standardNumber = approve[2].trim()

  const impl = SHANXI_IMPL_RE.exec(text)
  const implementDate = impl
    ? `${impl[1]}-${impl[2].padStart(2, '0')}-${impl[3].padStart(2, '0')}`
    : ''

  const results: StandardResult[] = [{
    query: opts.keyword,
    standard_number: standardNumber,
    title,
    // 公告语义即「新批准发布」,状态恒为现行;废止行由下一段回推
    status: STATUS.ACTIVE,
    publish_date: opts.pubDate || '',
    implement_date: implementDate,
    replaced_by: '',
    publisher: '山西省住房和城乡建设厅',
    category: '地方标准',
    ics: '',
  }]

  // 回推被本公告废止的旧标准:查新场景下「旧编号 → 已废止 + 被谁替代」比新标准本身更常被问
  const replaced = SHANXI_REPLACED_RE.exec(text)
  const oldNumber = replaced?.[2]?.trim()
  if (oldNumber && oldNumber !== standardNumber) {
    results.push({
      query: opts.keyword,
      standard_number: oldNumber,
      title: replaced?.[1]?.trim() || title,
      status: STATUS.DEPRECATED,
      publish_date: '',
      implement_date: '',
      replaced_by: standardNumber,
      publisher: '山西省住房和城乡建设厅',
      category: '地方标准',
      ics: '',
    })
  }

  return results
}
