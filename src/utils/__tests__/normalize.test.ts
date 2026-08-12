import { describe, expect, it } from 'vitest'
import { formatKeyword, normalizeKeyword, normalizeStdNo, stdBase } from '../normalize'

describe('normalizeKeyword', () => {
  it('trims whitespace', () => {
    expect(normalizeKeyword('  GB 50010-2010  ')).toBe('GB 50010-2010')
  })

  it('normalizes full-width dashes to hyphen', () => {
    expect(normalizeKeyword('GB 50010—2010')).toBe('GB 50010-2010')
    expect(normalizeKeyword('GB 50010–2010')).toBe('GB 50010-2010')
    expect(normalizeKeyword('GB 50010⁃2010')).toBe('GB 50010-2010')
  })

  it('removes bracketed annotations', () => {
    expect(normalizeKeyword('GB 50010-2010（2016年版）')).toBe('GB 50010-2010')
    expect(normalizeKeyword('GB 50010-2010(2016年版)')).toBe('GB 50010-2010')
  })

  it('normalizes GBT to GB/T and GB/ to GB space', () => {
    expect(normalizeKeyword('GBT 50311-2016')).toBe('GB/T 50311-2016')
    expect(normalizeKeyword('GB/50010')).toBe('GB 50010')
  })
})

describe('formatKeyword', () => {
  it('inserts space between letter prefix and digits', () => {
    expect(formatKeyword('GB50222')).toBe('GB 50222')
    expect(formatKeyword('JGJ3-2010')).toBe('JGJ 3-2010')
  })
})

describe('normalizeStdNo', () => {
  it('lowercases, strips spaces and normalizes dashes', () => {
    expect(normalizeStdNo('GB 50010-2010')).toBe('gb50010-2010')
    expect(normalizeStdNo('GB 50010—2010')).toBe('gb50010-2010')
  })
})

describe('stdBase', () => {
  it('strips the trailing year', () => {
    expect(stdBase('GB 50010-2010')).toBe('GB 50010')
  })

  it('leaves base numbers unchanged', () => {
    expect(stdBase('GB 50010')).toBe('GB 50010')
  })
})
