import { describe, expect, it } from 'vitest'
import { errMsg } from '../errors'

describe('errMsg', () => {
  it('extracts Error message', () => {
    expect(errMsg(new Error('boom'))).toBe('boom')
  })

  it('stringifies unknown values', () => {
    expect(errMsg('plain string')).toBe('plain string')
    expect(errMsg(42)).toBe('42')
  })
})
