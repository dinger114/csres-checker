import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCap } from '../useCap'

const SESSION_KEY = 'cap-session'

const solveMock = vi.fn()

vi.mock('@cap.js/widget', () => ({
  default: class {
    solve() {
      return solveMock()
    }
  },
}))

vi.mock('../../stores/log', () => ({
  useLogStore: () => ({ add: vi.fn() }),
}))

function seedSession(token: string, expiresMs: number) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, expires: Date.now() + expiresMs }))
}

describe('useCap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    useCap().endSession()
  })

  it('init restores a valid session from sessionStorage', () => {
    seedSession('tok:ver', 60_000)

    const cap = useCap()
    cap.init()

    expect(cap.hasValidToken()).toBe(true)
    expect(cap.getToken()).toBe('tok:ver')
    expect(cap.solved.value).toBe(true)
  })

  it('init discards an expired session', () => {
    seedSession('tok:ver', -1000)

    const cap = useCap()
    cap.init()

    expect(cap.hasValidToken()).toBe(false)
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('init ignores malformed session data', () => {
    sessionStorage.setItem(SESSION_KEY, '{broken json')

    const cap = useCap()
    cap.init()

    expect(cap.hasValidToken()).toBe(false)
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('ensureSolved returns the existing token without solving again', async () => {
    seedSession('tok:ver', 60_000)

    const cap = useCap()
    cap.init()
    const token = await cap.ensureSolved()

    expect(token).toBe('tok:ver')
    expect(solveMock).not.toHaveBeenCalled()
  })

  it('ensureSolved solves via the widget and stores the session', async () => {
    solveMock.mockResolvedValueOnce({ token: 'new:tok' })

    const cap = useCap()
    const token = await cap.ensureSolved()

    expect(token).toBe('new:tok')
    expect(solveMock).toHaveBeenCalledTimes(1)
    expect(cap.hasValidToken()).toBe(true)
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY)!).token).toBe('new:tok')
  })

  it('ensureSolved rethrows when solving fails', async () => {
    solveMock.mockRejectedValueOnce(new Error('boom'))

    const cap = useCap()
    await expect(cap.ensureSolved()).rejects.toThrow('boom')
    expect(cap.hasValidToken()).toBe(false)
  })

  it('endSession clears state, storage and posts to the worker', async () => {
    seedSession('tok:ver', 60_000)
    const cap = useCap()
    cap.init()

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
    cap.endSession()

    expect(cap.hasValidToken()).toBe(false)
    expect(cap.solved.value).toBe(false)
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/cap/end-session'),
      expect.objectContaining({ method: 'POST' }),
    )
    fetchSpy.mockRestore()
  })

  it('endSession is a no-op without a token', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    useCap().endSession()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
