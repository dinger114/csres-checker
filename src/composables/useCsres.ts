import type { StandardResult } from '../types'
import { normalizeKeyword } from '../utils/normalize'
import { parseCsresHtml } from '../utils/htmlParser'
import { useProxy } from './useProxy'

const CSRES_URL = 'http://www.csres.com/s.jsp'

export function useCsres() {
  const { race } = useProxy()

  async function query(keyword: string): Promise<StandardResult[]> {
    const normalized = normalizeKeyword(keyword)
    const url = `${CSRES_URL}?keyword=${encodeURIComponent(normalized)}`

    const html = await race(url)
    if (!html) return []

    return parseCsresHtml(html, keyword)
  }

  return { query }
}
