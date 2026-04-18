const ELEMENT_NODE = 1
const TEXT_NODE = 3

const ALLOWED_TAGS = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'details',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'ol',
  'p',
  'pre',
  'strong',
  'summary',
  'ul'
])

const DROP_WITH_CONTENT_TAGS = new Set([
  'iframe',
  'object',
  'script',
  'style',
  'svg'
])

const BLOCK_PATTERN = /^(#{1,6})\s+(.+)$/
const BULLET_PATTERN = /^[-*+]\s+(.+)$/
const ORDERED_PATTERN = /^\d+\.\s+(.+)$/
const INLINE_PATTERN =
  /(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(__(.+?)__)|(\*([^*]+)\*)|(_([^_]+)_)/g

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function sanitizeHref(value: string | null): string | null {
  if (!value) return null
  const href = value.trim()
  if (!href) return null

  try {
    const parsed = new URL(href)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
      return parsed.toString()
    }
  } catch {
    if (href.startsWith('/')) return href
  }

  return null
}

function renderInlineMarkdown(text: string): string {
  let html = ''
  let cursor = 0

  for (const match of text.matchAll(INLINE_PATTERN)) {
    const [fullMatch] = match
    const index = match.index ?? 0
    html += escapeHtml(text.slice(cursor, index))

    if (match[2]) {
      html += `<code>${escapeHtml(match[2])}</code>`
    } else if (match[4] && match[5]) {
      const href = sanitizeHref(match[5])
      const label = escapeHtml(match[4])
      html += href
        ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer noopener">${label}</a>`
        : label
    } else if (match[7] || match[9]) {
      html += `<strong>${escapeHtml(match[7] ?? match[9] ?? '')}</strong>`
    } else if (match[11] || match[13]) {
      html += `<em>${escapeHtml(match[11] ?? match[13] ?? '')}</em>`
    } else {
      html += escapeHtml(fullMatch)
    }

    cursor = index + fullMatch.length
  }

  html += escapeHtml(text.slice(cursor))
  return html
}

function renderPlainTextNotes(notes: string): string {
  const lines = notes.replace(/\r\n/g, '\n').split('\n')
  const blocks: string[] = []

  const isBlockBoundary = (line: string): boolean => {
    const trimmed = line.trim()
    return !trimmed || BLOCK_PATTERN.test(trimmed) || BULLET_PATTERN.test(trimmed) || ORDERED_PATTERN.test(trimmed)
  }

  for (let index = 0; index < lines.length;) {
    const trimmed = lines[index]?.trim() ?? ''
    if (!trimmed) {
      index += 1
      continue
    }

    const heading = trimmed.match(BLOCK_PATTERN)
    if (heading) {
      const level = Math.min(heading[1].length, 6)
      blocks.push(`<h${level}>${renderInlineMarkdown(heading[2].trim())}</h${level}>`)
      index += 1
      continue
    }

    const bullet = trimmed.match(BULLET_PATTERN)
    const ordered = trimmed.match(ORDERED_PATTERN)
    if (bullet || ordered) {
      const listTag = ordered ? 'ol' : 'ul'
      const itemPattern = ordered ? ORDERED_PATTERN : BULLET_PATTERN
      const items: string[] = []

      while (index < lines.length) {
        const line = lines[index]?.trim() ?? ''
        const itemMatch = line.match(itemPattern)
        if (!itemMatch) break
        items.push(`<li>${renderInlineMarkdown(itemMatch[1].trim())}</li>`)
        index += 1
      }

      blocks.push(`<${listTag}>${items.join('')}</${listTag}>`)
      continue
    }

    const paragraphLines = [trimmed]
    index += 1

    while (index < lines.length && !isBlockBoundary(lines[index] ?? '')) {
      paragraphLines.push((lines[index] ?? '').trim())
      index += 1
    }

    blocks.push(`<p>${renderInlineMarkdown(paragraphLines.join(' '))}</p>`)
  }

  return blocks.join('')
}

function sanitizeHtmlNode(node: ChildNode): string {
  if (node.nodeType === TEXT_NODE) {
    return escapeHtml(node.textContent ?? '')
  }

  if (node.nodeType !== ELEMENT_NODE) {
    return ''
  }

  const element = node as Element
  const tagName = element.tagName.toLowerCase()

  if (DROP_WITH_CONTENT_TAGS.has(tagName)) {
    return ''
  }

  const children = Array.from(element.childNodes).map(sanitizeHtmlNode).join('')
  if (!ALLOWED_TAGS.has(tagName)) {
    return children
  }

  if (tagName === 'br') {
    return '<br />'
  }

  if (tagName === 'a') {
    const href = sanitizeHref(element.getAttribute('href'))
    if (!href) return children
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer noopener">${children || escapeHtml(href)}</a>`
  }

  if (tagName === 'details') {
    const open = element.hasAttribute('open') ? ' open' : ''
    return `<details${open}>${children}</details>`
  }

  return `<${tagName}>${children}</${tagName}>`
}

function sanitizeHtmlNotes(notes: string): string {
  if (typeof DOMParser === 'undefined') {
    return renderPlainTextNotes(notes)
  }

  const document = new DOMParser().parseFromString(notes, 'text/html')
  return Array.from(document.body.childNodes).map(sanitizeHtmlNode).join('')
}

export function formatUpdateReleaseNotes(notes: string): string {
  const trimmed = notes.trim()
  if (!trimmed) return ''

  const looksLikeHtml = /<\/?[a-z][^>]*>/i.test(trimmed)
  return looksLikeHtml ? sanitizeHtmlNotes(trimmed) : renderPlainTextNotes(trimmed)
}
