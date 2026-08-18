export const BASE_URL = 'https://www.gongbiaoku.com/search/advance/result'

// 代理列表：本地 dev 首项指向 wrangler dev (localhost:8787)；生产环境只用远端代理。
export const PROXY_LIST = [
  ...(import.meta.env.DEV
    ? [(url: string) => `http://localhost:8787/?url=${encodeURIComponent(url)}`]
    : []),
  (url: string) => `https://api.dingyi.de/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api2.dingyi.de/?url=${encodeURIComponent(url)}`,
]

export const BATCH_SIZE = 2
export const BATCH_DELAY = 500
export const FETCH_RETRIES = 3
export const FETCH_TIMEOUT = 15000
