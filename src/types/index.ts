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

export interface LogStats {
  ok: number
  empty: number
  time: number
  queries: number
}
