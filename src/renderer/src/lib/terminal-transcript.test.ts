import { describe, expect, it } from 'vitest'
import { extractCommandTranscriptFromLines } from './terminal-transcript'

describe('terminal-transcript helpers', () => {
  it('extracts the lines that belong to a completed command block', () => {
    expect(
      extractCommandTranscriptFromLines(
        [
          'prompt> npm test',
          'running',
          'ok',
          'prompt> '
        ],
        0,
        3
      )
    ).toBe('prompt> npm test\nrunning\nok')
  })

  it('returns null when the block range is invalid or empty', () => {
    expect(extractCommandTranscriptFromLines(['prompt> '], null, 1)).toBeNull()
    expect(extractCommandTranscriptFromLines(['prompt> '], 4, 5)).toBeNull()
    expect(extractCommandTranscriptFromLines(['', '   '], 0, 2)).toBeNull()
  })
})
