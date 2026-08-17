import type { StandardResult } from '../types'
import { useLogStore } from '../stores/log'
import { errMsg } from '../utils/errors'
import { parseAtlasHtml } from '../utils/htmlParser'
import { normalizeKeyword } from '../utils/normalize'
import { useProxy } from './useProxy'

const ATLAS_URL = 'https://ebook.chinabuilding.com.cn/zbooklib/search'

export function useAtlas() {
  const { race } = useProxy()
  const { add } = useLogStore()

  async function query(keyword: string): Promise<StandardResult[]> {
    const normalized = normalizeKeyword(keyword).replace(/\s+/g, '')

    const params = new URLSearchParams({
      SiteID: '1',
      contentType: 'book',
      SearchKey: normalized,
    })
    const url = `${ATLAS_URL}?${params.toString()}`

    try {
      add(`atlas: "${normalized}"`, 'info')
      const t0 = Date.now()
      const html = await race(url)
      if (!html) {
        add('atlas: 代理全部失败', 'error')
        return []
      }
      add(`atlas response: ${html.length} bytes, ${Date.now() - t0}ms`, 'info')
      const results = parseAtlasHtml(html, keyword)
      if (results.length > 0) {
        add(`found ${results.length} results:`, 'success')
        results.forEach((r, i) => add(`  [${i + 1}] ${r.standard_number} | ${r.title} | ${r.status}`, 'info'))
      }
      return results
    }
    catch (e) {
      add(`atlas error: ${errMsg(e)}`, 'error')
      return []
    }
  }

  return { query }
}
