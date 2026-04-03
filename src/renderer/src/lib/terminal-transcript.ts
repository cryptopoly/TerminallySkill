function trimTrailingBlankLines(lines: string[]): string[] {
  const next = [...lines]
  while (next.length > 0 && next[next.length - 1].trim().length === 0) {
    next.pop()
  }
  return next
}

export function extractCommandTranscriptFromLines(
  lines: string[],
  startLine: number | null,
  endLine: number | null
): string | null {
  if (startLine === null || startLine < 0) return null

  const normalized = trimTrailingBlankLines(lines)
  if (startLine >= normalized.length) return null

  const inclusiveEnd = endLine === null
    ? normalized.length - 1
    : Math.max(startLine, endLine - 1)

  const slice = normalized.slice(startLine, inclusiveEnd + 1)
  const transcript = slice.join('\n').trim()
  return transcript.length > 0 ? transcript : null
}
