import { describe, expect, it } from 'vitest'
import { parseAtlasHtml, parseCqDbHtml, parseCsresHtml, parseGongbiaokuHtml } from '../htmlParser'

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
