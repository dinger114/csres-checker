import { ref } from 'vue'
import { useLogStore } from '../stores/log'
import { errMsg } from '../utils/errors'

// 与 useCounter 同一个 Worker。本地 dev 默认指向 wrangler dev（localhost:8787）。
const CAPTCHA_WORKER = import.meta.env.VITE_CAPTCHA_WORKER_URL
  || (import.meta.env.DEV ? 'http://localhost:8787' : 'https://counter.dingyi.de')

const SESSION_KEY = 'cap-session'
// 与 Worker 侧 tokenTtlMs(900_000) 对齐
const SESSION_TTL_MS = 15 * 60 * 1000

const solved = ref(false)
const token = ref<string | null>(null)
const expires = ref(0)

function hasValidToken(): boolean {
  return !!token.value && expires.value > Date.now()
}

export function getToken(): string | null {
  return hasValidToken() ? token.value : null
}

function init() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw)
      return
    const data = JSON.parse(raw)
    if (typeof data.token === 'string' && typeof data.expires === 'number' && data.expires > Date.now()) {
      token.value = data.token
      expires.value = data.expires
      solved.value = true
    }
    else {
      sessionStorage.removeItem(SESSION_KEY)
    }
  }
  catch {
    sessionStorage.removeItem(SESSION_KEY)
  }
}

async function ensureSolved(): Promise<string> {
  if (hasValidToken())
    return token.value!

  const { add } = useLogStore()
  add('cap: 开始安全验证', 'info')
  try {
    // PoW 哈希用 WASM，运行时从自托管文件加载，不走 CDN
    if (!window.CAP_CUSTOM_WASM_URL)
      window.CAP_CUSTOM_WASM_URL = new URL('cap_wasm_bg.wasm', window.location.href).href

    const { default: Cap } = await import('@cap.js/widget')
    const cap = new Cap({ apiEndpoint: `${CAPTCHA_WORKER}/cap/` })
    const result = await cap.solve()
    if (!result.token)
      throw new Error('solve failed')

    const exp = Date.now() + SESSION_TTL_MS
    token.value = result.token
    expires.value = exp
    solved.value = true
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: result.token, expires: exp }))
    add('cap: 安全验证完成', 'success')
    return result.token
  }
  catch (e) {
    add(`cap: 安全验证失败 ${errMsg(e)}`, 'error')
    throw e
  }
}

function endSession() {
  const t = token.value
  sessionStorage.removeItem(SESSION_KEY)
  token.value = null
  expires.value = 0
  solved.value = false
  if (t) {
    fetch(`${CAPTCHA_WORKER}/cap/end-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: t }),
    }).catch(() => {})
  }
}

export function useCap() {
  return { solved, token, expires, init, hasValidToken, getToken, ensureSolved, endSession }
}
