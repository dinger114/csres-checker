import { describe, expect, it } from 'vitest'
import { parseAtlasHtml, parseCqDbHtml, parseCsresHtml, parseGongbiaokuHtml, parseShanxiAnnouncementHtml, parseShanxiEntryPdfHtml } from '../htmlParser'

const cqdbHtml = `
<table class="layui-table">
  <tbody>
    <tr>
      <td>DBJ50/T-562</td>
      <td>某工程标准</td>
      <td>2026-01-01</td>
      <td>2026-07-01</td>
      <td>现行</td>
      <td></td>
      <td>DBJ50/T-563</td>
      <td>某单位</td>
      <td></td>
      <td></td>
      <td><a href="/file/abc.pdf">下载</a></td>
    </tr>
  </tbody>
</table>`

describe('parseCqDbHtml', () => {
  it('parses a row into a StandardResult with pdf url', () => {
    const results = parseCqDbHtml(cqdbHtml, 'DBJ50/T-562')
    expect(results).toHaveLength(1)
    const r = results[0]
    expect(r.standard_number).toBe('DBJ50/T-562')
    expect(r.title).toBe('某工程标准')
    expect(r.status).toBe('现行')
    expect(r.publish_date).toBe('2026-01-01')
    expect(r.implement_date).toBe('2026-07-01')
    expect(r.replaced_by).toBe('DBJ50/T-563')
    expect(r.pdf_url).toBe('http://183.66.41.2:3757/x/file/abc.pdf')
    expect(r.query).toBe('DBJ50/T-562')
  })

  it('returns empty for rows with too few cells', () => {
    const results = parseCqDbHtml('<table><tbody><tr><td>a</td></tr></tbody></table>', 'x')
    expect(results).toHaveLength(0)
  })
})

const gongbiaokuHtml = `
<ul class="box-list">
  <li>
    <ul class="name-intr">
      <li><span>标准编号：</span>GB 50010-2010</li>
      <li><span>标准名称：</span>混凝土结构设计规范</li>
      <li><span>发布日期：</span>2010-08-18</li>
      <li><span>实施日期：</span>2011-07-01</li>
    </ul>
    <span class="label-fz">现行</span>
    <div class="date"><span>发布日期：2010-08-18</span></div>
    被以下标准替代：GB 50010-2024
  </li>
</ul>`

describe('parseGongbiaokuHtml', () => {
  it('parses list item info fields and status label', () => {
    const results = parseGongbiaokuHtml(gongbiaokuHtml, 'GB 50010')
    expect(results).toHaveLength(1)
    const r = results[0]
    expect(r.standard_number).toBe('GB 50010-2010')
    expect(r.title).toBe('混凝土结构设计规范')
    expect(r.status).toBe('现行')
    expect(r.publish_date).toBe('2010-08-18')
    expect(r.implement_date).toBe('2011-07-01')
  })

  it('extracts replaced-by from 替代 text', () => {
    const results = parseGongbiaokuHtml(gongbiaokuHtml, 'GB 50010')
    expect(results[0].replaced_by).toBe('GB 50010-2024')
  })
})

const csresHtml = `
<table>
  <tr bgcolor="#FFFFFF" title="发布日期：2010-08-18
实施日期：2011-07-01">
    <td>GB 50010-2010</td>
    <td>混凝土结构设计规范</td>
    <td>x</td>
    <td>y</td>
    <td>现行</td>
  </tr>
</table>`

describe('parseCsresHtml', () => {
  it('parses row and title attribute info', () => {
    const results = parseCsresHtml(csresHtml, 'GB 50010')
    expect(results).toHaveLength(1)
    const r = results[0]
    expect(r.standard_number).toBe('GB 50010-2010')
    expect(r.title).toBe('混凝土结构设计规范')
    expect(r.status).toBe('现行')
    expect(r.publish_date).toBe('2010-08-18')
    expect(r.implement_date).toBe('2011-07-01')
  })

  it('marks older versions of the same standard as 被代替', () => {
    const html = `
<table>
  <tr bgcolor="#FFFFFF"><td>GB 50010-2010</td><td>旧版</td><td></td><td></td><td>现行</td></tr>
  <tr bgcolor="#FFFFFF"><td>GB 50010-2024</td><td>新版</td><td></td><td></td><td>现行</td></tr>
</table>`
    const results = parseCsresHtml(html, 'GB 50010')
    expect(results).toHaveLength(2)
    const old = results.find(r => r.standard_number === 'GB 50010-2010')!
    expect(old.status).toBe('被代替')
    expect(old.replaced_by).toBe('GB 50010-2024')
  })
})

const atlasHtml = `
<div class="bz_list clearfix">
  <div class="widthPrencent14"><a href="/zbooklib/book/detail/show?SiteID=1&bookID=54308" title="05SJ810">05SJ810</a></div>
  <div class="widthPrencent28"><a href="/zbooklib/book/detail/show?SiteID=1&bookID=54308" title="建筑实践教学及见习建筑师图册">建筑实践教学及见习建筑师图册</a></div>
  <div class="borderGray search-resources"><span class="active">现行</span></div>
  <div class="borderGray hidden-xs"><span class="visible-xs">发布日期：</span>2005-09-01</div>
  <div class="borderGray hidden-xs"><span class="visible-xs">实施日期:</span>2005-09-02</div>
  <div class="borderGray hidden-xs"><span class="visible-xs">废止日期：</span>-</div>
</div>`

describe('parseAtlasHtml', () => {
  it('parses an atlas row with number, name, status and dates', () => {
    const results = parseAtlasHtml(atlasHtml, '05SJ810')
    expect(results).toHaveLength(1)
    const r = results[0]
    expect(r.standard_number).toBe('05SJ810')
    expect(r.title).toBe('建筑实践教学及见习建筑师图册')
    expect(r.status).toBe('现行')
    expect(r.publish_date).toBe('2005-09-01')
    expect(r.implement_date).toBe('2005-09-02')
    expect(r.category).toBe('标准图集')
  })

  it('returns empty when no atlas rows match', () => {
    const results = parseAtlasHtml('<div class="other"></div>', '05SJ810')
    expect(results).toEqual([])
  })
})

// 山西公告正文实测结构:div.trs_editor_view 内段落被 Word 粘贴的 <span style> 切碎,
// 且含 U+2002 等 Unicode 空白,解析器先取纯文本再正则
function shanxiAnnouncement(bodyHtml: string): string {
  return `
<div class="trs_editor_view TRS_UEDITOR trs_paper_default trs_word">
  <p><span style="font-size: 16px;">${bodyHtml}</span></p>
</div>`
}

describe('parseShanxiAnnouncementHtml', () => {
  it('parses number, title and implement date from 发布公告 (全角括号替代子句)', () => {
    const html = shanxiAnnouncement(
      '现批准《城市综合管廊工程技术标准》为山西省工程建设地方标准，编号为DBJ04/T389-2026，自2026年9月1日起实施。'
      + '原《城市综合管廊工程技术标准》（DBJ04/T389-2019）同时废止。'
      + '本标准由山西省住房和城乡建设厅负责管理。',
    )
    const results = parseShanxiAnnouncementHtml(html, { keyword: 'DBJ04/T389-2026', pubDate: '2026-06-11' })

    expect(results).toHaveLength(2)
    const [newStd, oldStd] = results
    expect(newStd.standard_number).toBe('DBJ04/T389-2026')
    expect(newStd.title).toBe('城市综合管廊工程技术标准')
    expect(newStd.status).toBe('现行')
    expect(newStd.publish_date).toBe('2026-06-11')
    expect(newStd.implement_date).toBe('2026-09-01')
    expect(newStd.replaced_by).toBe('')
    expect(newStd.publisher).toBe('山西省住房和城乡建设厅')
    expect(newStd.category).toBe('地方标准')

    // 回推被废止的旧标准:查新场景最常问的「旧编号 → 已废止 + 被谁替代」
    expect(oldStd.standard_number).toBe('DBJ04/T389-2019')
    expect(oldStd.status).toBe('废止')
    expect(oldStd.replaced_by).toBe('DBJ04/T389-2026')
  })

  it('handles 半角括号 in the old title and no brackets around the old number', () => {
    const html = shanxiAnnouncement(
      '现批准《现浇混凝土内置保温系统应用技术标准》为山西省工程建设地方标准，编号为DBJ04/T382-2026，自2026年9月1日起实施。'
      + '原《现浇混凝土内置保温体系(SD)应用技术标准》DBJ04/T375-2018同时废止。',
    )
    const results = parseShanxiAnnouncementHtml(html, { keyword: 'DBJ04/T382-2026' })

    expect(results).toHaveLength(2)
    expect(results[0].standard_number).toBe('DBJ04/T382-2026')
    // 旧名称含半角括号,非贪婪匹配不应越界
    expect(results[1].title).toBe('现浇混凝土内置保温体系(SD)应用技术标准')
    expect(results[1].standard_number).toBe('DBJ04/T375-2018')
    expect(results[1].status).toBe('废止')
    expect(results[1].replaced_by).toBe('DBJ04/T382-2026')
  })

  it('returns a single row when there is no 同时废止 clause', () => {
    const html = shanxiAnnouncement(
      '现批准《好房子技术标准》为山西省工程建设地方标准，编号为DBJ04/T523-2026，自2026年9月1日起实施。'
      + '本标准由山西省住房和城乡建设厅负责管理。山西省住房和城乡建设厅\u2002\u2002\u20022026年6月11日（主动公开）',
    )
    const results = parseShanxiAnnouncementHtml(html, { keyword: 'DBJ04/T523-2026', pubDate: '2026-06-11' })

    expect(results).toHaveLength(1)
    expect(results[0].standard_number).toBe('DBJ04/T523-2026')
    expect(results[0].title).toBe('好房子技术标准')
    expect(results[0].implement_date).toBe('2026-09-01')
  })

  it('pads single-digit month/day to ISO form', () => {
    const html = shanxiAnnouncement(
      '现批准《某标准》为山西省工程建设地方标准，编号为DBJ04/T900-2026，自2026年1月5日起施行。',
    )
    const results = parseShanxiAnnouncementHtml(html, { keyword: 'DBJ04/T900-2026' })

    expect(results[0].implement_date).toBe('2026-01-05')
  })

  it('returns empty when the body has no 现批准 clause', () => {
    const html = shanxiAnnouncement('本标准由山西省住房和城乡建设厅负责管理。')
    expect(parseShanxiAnnouncementHtml(html, { keyword: 'x' })).toEqual([])
  })

  it('returns empty when the editor container is missing', () => {
    expect(parseShanxiAnnouncementHtml('<div class="other">现批准《x》</div>', { keyword: 'x' })).toEqual([])
  })

  // 2023 年公告用的是 div.view TRS_UEDITOR …(不是 trs_editor_view),
  // 只认 trs_editor_view 会静默漏掉老页面 —— 实测 DBJ04/T444-2023 就是这么丢的
  it('parses the older div.view TRS_UEDITOR template', () => {
    const html = `
<div class="view TRS_UEDITOR trs_paper_default trs_web">
  <p><span data-index="14" style="font-size: 14px;">\u2002\u2002\u2002\u2002</span><span data-index="14" style="font-size: 14px;">现批准《预制装配整体式混凝土城市综合管廊结构技术标准》为山西省工程建设地方标准，编号为DBJ04/T444-2023，自2023年7月1日起实施。</span></p>
  <p><span data-index="14" style="font-size: 14px;">\u2002\u2002\u2002\u2002本标准由山西省住房和城乡建设厅负责管理。</span></p>
</div>`
    const results = parseShanxiAnnouncementHtml(html, { keyword: '城市综合管廊', pubDate: '2023-04-12' })

    expect(results).toHaveLength(1)
    expect(results[0].standard_number).toBe('DBJ04/T444-2023')
    expect(results[0].title).toBe('预制装配整体式混凝土城市综合管廊结构技术标准')
    expect(results[0].implement_date).toBe('2023-07-01')
    expect(results[0].publish_date).toBe('2023-04-12')
  })
})

// 标准库条目页(…/bzgf/bzk/*.shtml):无标准编号,只有 PDF 附件
const shanxiEntryHtml = `
<div class="content">
  <p><a style="color: rgb(0, 102, 204);" appendix="true" data-appendix="true" needdownload="true"
        href="./P020260612553273540285.pdf" title="《城市综合管廊工程技术标准》.pdf"
        download="《城市综合管廊工程技术标准》.pdf">《城市综合管廊工程技术标准》.pdf</a></p>
</div>`

describe('parseShanxiEntryPdfHtml', () => {
  it('resolves the relative appendix href against the entry page url', () => {
    const url = 'http://zjt.shanxi.gov.cn/zfxxgk/zfxxgkml/bzgf/bzk/202606/t20260612_10145310.shtml'
    expect(parseShanxiEntryPdfHtml(shanxiEntryHtml, url))
      .toBe('http://zjt.shanxi.gov.cn/zfxxgk/zfxxgkml/bzgf/bzk/202606/P020260612553273540285.pdf')
  })

  it('returns empty when the page has no pdf attachment', () => {
    expect(parseShanxiEntryPdfHtml('<div>没有附件</div>', 'http://x/y/z.shtml')).toBe('')
  })

  it('ignores anchors that are not pdf', () => {
    const html = '<a appendix="true" href="./doc.docx">文档</a>'
    expect(parseShanxiEntryPdfHtml(html, 'http://x/y/z.shtml')).toBe('')
  })

  it('falls back to p.insertfileTag anchors', () => {
    const html = '<p class="insertfileTag"><a href="./P02025.pdf">附件</a></p>'
    expect(parseShanxiEntryPdfHtml(html, 'http://x/bzk/a.shtml')).toBe('http://x/bzk/P02025.pdf')
  })
})
