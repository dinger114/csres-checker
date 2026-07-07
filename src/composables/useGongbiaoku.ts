import type { StandardResult } from '../types'
import { BASE_URL } from '../utils/constants'
import { formatKeyword, normalizeKeyword } from '../utils/normalize'
import { parseGongbiaokuHtml } from '../utils/htmlParser'
import { useProxy } from './useProxy'

export function useGongbiaoku() {
  const { race } = useProxy()

  async function query(keyword: string): Promise<StandardResult[]> {
    const normalized = normalizeKeyword(keyword)
    const formatted = formatKeyword(normalized)
    const params = new URLSearchParams({ query: formatted })
    const url = `${BASE_URL}?${params.toString()}`

    const html = await race(url)
    if (!html) return []

    return parseGongbiaokuHtml(html, keyword)
  }

  return { query }
}
