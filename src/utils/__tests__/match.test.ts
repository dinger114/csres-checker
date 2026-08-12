import { describe, expect, it } from 'vitest'
import { matchStdNo } from '../match'

describe('matchStdNo', () => {
  it('matches exact normalized numbers', () => {
    expect(matchStdNo('gb50010-2010', 'gb50010-2010')).toBe(true)
  })

  it('matches when standard number contains the query', () => {
    expect(matchStdNo('gb50010', 'gb50010-2010')).toBe(true)
  })

  it('matches when query contains the standard number', () => {
    expect(matchStdNo('gb50010-2010', 'gb50010')).toBe(true)
  })

  it('matches prefix + same number across formats', () => {
    // GB50222 query vs GB 50222-2017 standard
    expect(matchStdNo('gb50222', 'gb50222-2017')).toBe(true)
    // same digits, different prefix letter → no match
    expect(matchStdNo('jb50010', 'gb50010-2010')).toBe(false)
  })

  it('rejects unrelated numbers', () => {
    expect(matchStdNo('gb50011', 'gb50010-2010')).toBe(false)
    expect(matchStdNo('iso9001', 'gb50010-2010')).toBe(false)
  })
})
