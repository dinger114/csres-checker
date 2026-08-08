import type { StandardResult } from '../types'
import { normalizeKeyword, stdBase } from '../utils/normalize'
import { parseCqDbHtml } from '../utils/htmlParser'
import { useProxy } from './useProxy'
import { useLog } from './useLog'

const CQDB_URL = 'https://cq.dingyi.de/x/down.php'

export function useCqdb() {
  const { race } = useProxy()
  const { add } = useLog()

  async function query(keyword: string): Promise<StandardResult[]> {
    // 该站编号年份用 U+2043 分隔(DBJ50/T-562⁃2026),且年份可匹配到新版本,
    // 因此剥离年份后缀、用基础编号做前缀匹配
    const normalized = stdBase(normalizeKeyword(keyword).replace(/\s/g, ''))
    const params = new URLSearchParams({
      lei: '2',
      code: normalized,
      title: '',
      zt: '',
    })
    const url = `${CQDB_URL}?${params.toString()}`

    try {
      add(`cqdb: "${normalized}"`, 'info')
      const t0 = Date.now()
      const html = await race(url)
      if (!html) {
        add('cqdb: 代理全部失败', 'error')
        return []
      }
      add(`response: ${html.length} bytes, ${Date.now() - t0}ms`, 'info')
      const results = parseCqDbHtml(html, keyword)
      if (results.length > 0) {
        add(`found ${results.length} results:`, 'success')
        results.forEach((r, i) => add(`  [${i + 1}] ${r.standard_number} | ${r.title} | ${r.status}`, 'info'))
      }
      return results
    } catch (e: any) {
      add(`cqdb error: ${e.message}`, 'error')
      return []
    }
  }

  return { query }
}
