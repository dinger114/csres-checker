export interface StandardResult {
  query: string
  standard_number: string
  title: string
  status: string
  publish_date: string
  implement_date: string
  replaced_by: string
  publisher: string
  category: string
  ics: string
  pdf_url?: string
  versions?: StandardVersion[]
}

export interface StandardVersion {
  standard_number: string
  title: string
  status: string
  publish_date: string
  implement_date: string
}

export interface LogEntry {
  time: string
  message: string
  type: LogType
}

export type LogType = 'info' | 'success' | 'warn' | 'error' | 'highlight'

export type ThemeMode = 'dark' | 'light'

export interface ProgressState {
  current: number
  total: number
  pct: number
}

// cssn.net.cn 原始 API 响应
export interface CssnItem {
  a100?: string
  a298?: string
  a000?: string
  a101?: string
  a205?: string
}

export interface CssnResponse {
  results: CssnItem[]
  next: string | null
}

// bzsou.cn 原始 API 响应
export interface BzsouItem {
  STAN_NUM?: string
  STAN_CNNAME?: string
  STAN_STATUS?: string
  PUB_DATE?: string
  IMPL_DATE?: string
  STAN_PART_YEAR?: number
  RELEASE_ORG?: string
  CCS_NAME?: string
  ICS_NAME?: string
}

export interface BzsouResponse {
  totalCount?: number
  result?: BzsouItem[]
}

export interface LogStats {
  ok: number
  empty: number
  time: number
  queries: number
}
