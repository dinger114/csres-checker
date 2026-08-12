import type { StandardResult } from '../types'
import { useLogStore } from '../stores/log'
import { BASE_URL } from '../utils/constants'
import { errMsg } from '../utils/errors'
import { parseGongbiaokuHtml } from '../utils/htmlParser'
import { formatKeyword, normalizeKeyword } from '../utils/normalize'
import { useProxy } from './useProxy'

export function useGongbiaoku() {
  const { race } = useProxy()
  const { add } = useLogStore()

  async function query(keyword: string): Promise<StandardResult[]> {
    const normalized = normalizeKeyword(keyword)
    const formatted = formatKeyword(normalized)
    const params = new URLSearchParams({
      relate: 'and',
      cnName: '',
      standardNo: formatted,
      mainEditorPeople: '',
      checkPeople: '',
      publishDate_start: '',
      publishDate_end: '',
      implementDate_start: '',
      implementDate_end: '',
      annulDate_start: '',
      annulDate_end: '',
      mainEditorIns: '',
      approveIns: '',
      publishIns: '',
      allMainEditorIns: '',
      allSideEditorIns: '',
      draftingIns: '',
      belongIns: '',
      fzDraftingIns: '',
      cjDraftingIns: '',
      allIns: '',
      scope: '',
      announcement: '',
    })
    const url = `${BASE_URL}?${params.toString()}`

    try {
      add(`gongbiaoku: "${formatted}"`, 'info')
      const t0 = Date.now()
      const html = await race(url)
      if (!html) {
        add('gongbiaoku: 代理全部失败', 'error')
        return []
      }
      add(`response: ${html.length} bytes, ${Date.now() - t0}ms`, 'info')
      const results = parseGongbiaokuHtml(html, keyword)
      if (results.length > 0) {
        add(`found ${results.length} results:`, 'success')
        results.forEach((r, i) => add(`  [${i + 1}] ${r.standard_number} | ${r.title} | ${r.status}`, 'info'))
      }
      return results
    }
    catch (e) {
      add(`gongbiaoku error: ${errMsg(e)}`, 'error')
      return []
    }
  }

  return { query }
}
