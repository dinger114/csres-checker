// 探测 biaozhun.org 作为 csres-checker 新数据源的可行性
// 用法: bun scripts/probe-biaozhun.mjs
const BASE = 'https://www.biaozhun.org'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

// 模拟项目里的规范化：GB 50010-2010 -> 50010-2010（站点建议去掉 GB/GB/T 前缀）
function normalize(kw) {
  return kw.replace(/^GB\/?T?\s*/i, '').replace(/\s+/g, ' ').trim()
}

async function search(raw) {
  const q = normalize(raw)
  const url = `${BASE}/plus/search.php?q=${encodeURIComponent(q)}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok)
    return { raw, q, error: `HTTP ${res.status}` }
  const html = await res.text()
  const seg = html.split('热门推荐')[0]
  const found = seg.match(/结果共找到 <font[^>]*>(\d+)<\/font> 条/)
  const items = [...seg.matchAll(/<a href="(\/[a-z]+\/\d+\.html)"[^>]*>(.*?)<\/a>/g)]
    .map(m => ({ url: m[1], title: m[2].replace(/<[^>]+>/g, '').trim() }))
  const state = seg.match(/<div class="state">([^<]+)<\/div>/)?.[1] ?? null
  const pub = seg.match(/发布日期:<em>([^<]+)<\/em>/)?.[1] ?? null
  const impl = seg.match(/实施日期:<em>([^<]+)<\/em>/)?.[1] ?? null
  return { raw, q, found: found ? +found[1] : -1, items, state, pub, impl }
}

const cases = [
  'GB 50010-2010', // 现行 国标
  'GB/T 37117-2018', // 推荐性国标（黄山黑鸡，站点举例）
  'JGJ 3-2010', // 行业标准
  'DBJ50/T-562', // 重庆地标
  'GB 50016-2014', // 现行
  'GB 50222-2017', // 现行
  'GB 99999999-2099', // 不存在
]

for (const kw of cases) {
  const r = await search(kw)
  const hit = r.items[0]
  console.log(`\n${kw}`)
  console.log(`  query=${r.q} found=${r.found} state=${r.state} pub=${r.pub} impl=${r.impl}`)
  if (hit)
    console.log(`  hit: ${hit.title} (${hit.url})`)
  else if (r.found > 0)
    console.log(`  items: ${JSON.stringify(r.items.slice(0, 3))}`)
}
