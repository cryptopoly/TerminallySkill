import { describe, expect, it } from 'vitest'
import { findTextMatches, getWrappedMatchIndex } from './log-search'

describe('log-search helpers', () => {
  it('finds case-insensitive matches in content', () => {
    expect(findTextMatches('Error\nanother error\nok', 'error')).toEqual([
      { start: 0, end: 5 },
      { start: 14, end: 19 }
    ])
  })

  it('caps the number of highlighted matches', () => {
    expect(findTextMatches('aaaaa', 'a', 3)).toHaveLength(3)
  })

  it('wraps previous and next match navigation', () => {
    expect(getWrappedMatchIndex(0, 3, 'previous')).toBe(2)
    expect(getWrappedMatchIndex(2, 3, 'next')).toBe(0)
    expect(getWrappedMatchIndex(-1, 3, 'next')).toBe(0)
  })
})
