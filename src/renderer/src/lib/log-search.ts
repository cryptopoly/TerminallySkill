export interface TextMatchRange {
  start: number
  end: number
}

export function findTextMatches(
  content: string,
  query: string,
  limit = 500
): TextMatchRange[] {
  const needle = query.trim()
  if (!needle) return []

  const haystack = content.toLowerCase()
  const normalizedNeedle = needle.toLowerCase()
  const matches: TextMatchRange[] = []
  let startIndex = 0

  while (startIndex < haystack.length && matches.length < limit) {
    const index = haystack.indexOf(normalizedNeedle, startIndex)
    if (index === -1) break
    matches.push({ start: index, end: index + normalizedNeedle.length })
    startIndex = index + normalizedNeedle.length
  }

  return matches
}

export function getWrappedMatchIndex(
  currentIndex: number,
  totalMatches: number,
  direction: 'next' | 'previous'
): number {
  if (totalMatches <= 0) return -1
  if (currentIndex < 0) return 0

  return direction === 'next'
    ? (currentIndex + 1) % totalMatches
    : (currentIndex - 1 + totalMatches) % totalMatches
}
