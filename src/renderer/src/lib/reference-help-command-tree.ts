import type {
  CommandOption,
  CommandReferenceHelpSections,
  CommandReferenceHelpRow,
  EnumChoice,
  PositionalArgument
} from '../../../shared/command-schema'

export interface ReferenceHelpCommandTreeSuggestion {
  options: CommandOption[]
  positionalArgs: PositionalArgument[]
}

function stripInlineMarkup(value: string): string {
  return value.replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim()
}

function humanizeOptionName(value: string): string {
  return value
    .replace(/^--?/, '')
    .replace(/[<_>]/g, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim()
}

function parseOptionTokens(label: string): {
  shorts: string[]
  longs: string[]
  placeholder?: string
} {
  const normalized = stripInlineMarkup(label)
  const shorts = new Set<string>()
  const longs = new Set<string>()
  let placeholder: string | undefined

  const longMatches = normalized.matchAll(/(^|[\s,])(--[a-z0-9][a-z0-9-]*)(?:[=\s]+(<[^>]+>|[A-Z][A-Z0-9_-]*))?/gi)
  for (const match of longMatches) {
    if (match[2]) longs.add(match[2])
    if (!placeholder && match[3]) placeholder = match[3]
  }

  const shortMatches = normalized.matchAll(/(^|[\s,])(-[a-z0-9])(?![a-z0-9-])(?:[=\s]+(<[^>]+>|[A-Z][A-Z0-9_-]*))?/gi)
  for (const match of shortMatches) {
    if (match[2]) shorts.add(match[2])
    if (!placeholder && match[3]) placeholder = match[3]
  }

  return {
    shorts: [...shorts],
    longs: [...longs],
    placeholder
  }
}

function extractAliasReference(description: string): string | null {
  const normalized = stripInlineMarkup(description)
  const match = normalized.match(/\b(?:same as|equivalent to)\s+(--[a-z0-9][a-z0-9-]*|-[a-z0-9])\b/i)
  return match?.[1]?.toLowerCase() ?? null
}

function getKnownEnumChoices(optionId: string): EnumChoice[] | undefined {
  const normalized = optionId.toLowerCase()

  if (normalized === 'color') {
    return [
      { value: 'auto', label: 'Auto', description: 'Only colorize when output is a terminal' },
      { value: 'always', label: 'Always', description: 'Always colorize output' },
      { value: 'never', label: 'Never', description: 'Never colorize output' }
    ]
  }

  if (normalized === 'sort') {
    return [
      { value: 'name', label: 'Name', description: 'Sort alphabetically by name' },
      { value: 'size', label: 'Size', description: 'Sort by file size' },
      { value: 'time', label: 'Time', description: 'Sort by modification time' },
      { value: 'extension', label: 'Extension', description: 'Sort by file extension' },
      { value: 'none', label: 'None', description: 'Do not sort' }
    ]
  }

  return undefined
}

function inferOptionType(
  optionId: string,
  placeholder: string | undefined,
  description: string
): { type: CommandOption['type']; choices?: EnumChoice[] } {
  const normalizedPlaceholder = placeholder?.replace(/[<>]/g, '').toLowerCase() ?? ''
  const normalizedDescription = description.toLowerCase()
  const knownChoices = getKnownEnumChoices(optionId)

  if (knownChoices) {
    return { type: 'enum', choices: knownChoices }
  }

  if (!normalizedPlaceholder) {
    return { type: 'boolean' }
  }

  if (/(path|file|dir|directory|folder)/.test(normalizedPlaceholder)) {
    return {
      type: /(dir|directory|folder)/.test(normalizedPlaceholder) ? 'directory-path' : 'file-path'
    }
  }

  if (/(count|num|size|seconds|ms|timeout|depth|lines)/.test(normalizedPlaceholder)) {
    return { type: 'number' }
  }

  if (/(mode|sort|color|time|style|format|level|when|type)/.test(normalizedPlaceholder) || normalizedDescription.includes('choose')) {
    return { type: 'string' }
  }

  return { type: 'string' }
}

function buildOptionFromRow(row: CommandReferenceHelpRow): CommandOption | null {
  const parsed = parseOptionTokens(row.label)
  if (parsed.shorts.length === 0 && parsed.longs.length === 0) return null

  const short = parsed.shorts[0]
  const long = parsed.longs[0]
  const optionId = (long || short || row.label).replace(/^--?/, '').replace(/[<>]/g, '').toLowerCase()
  const inferred = inferOptionType(optionId, parsed.placeholder, row.description)

  return {
    id: optionId.replace(/[^a-z0-9_-]+/g, '-'),
    short,
    long,
    label: humanizeOptionName(long || short || row.label),
    description: stripInlineMarkup(row.description),
    type: inferred.type,
    choices: inferred.choices
  }
}

function mergeOptionRows(rows: CommandReferenceHelpRow[]): CommandReferenceHelpRow[] {
  const canonicalByToken = new Map<string, CommandReferenceHelpRow>()
  const aliasReferences = new Map<CommandReferenceHelpRow, string>()

  for (const row of rows) {
    const parsed = parseOptionTokens(row.label)
    const reference = extractAliasReference(row.description)
    if (reference) aliasReferences.set(row, reference)

    const primaryToken = parsed.longs[0]?.toLowerCase() ?? parsed.shorts[0]?.toLowerCase()
    if (primaryToken && !reference) {
      canonicalByToken.set(primaryToken, row)
    }

    for (const token of [...parsed.shorts, ...parsed.longs]) {
      if (!reference) {
        canonicalByToken.set(token.toLowerCase(), row)
      }
    }
  }

  for (const [row, reference] of aliasReferences) {
    const target = canonicalByToken.get(reference)
    if (!target) continue

    const rowTokens = parseOptionTokens(row.label)
    const targetTokens = parseOptionTokens(target.label)
    const mergedTokens = [...new Set([...targetTokens.shorts, ...rowTokens.shorts, ...targetTokens.longs, ...rowTokens.longs])]
    const mergedLabel = mergedTokens.join(', ')
    const betterDescription =
      stripInlineMarkup(target.description).length >= stripInlineMarkup(row.description).length
        ? target.description
        : row.description

    target.label = mergedLabel
    target.description = betterDescription

    for (const token of mergedTokens) {
      canonicalByToken.set(token.toLowerCase(), target)
    }
  }

  return [...new Set(canonicalByToken.values())]
}

function buildPositionalArgs(rows: CommandReferenceHelpRow[]): PositionalArgument[] {
  const combined = rows
    .map((row) => `${stripInlineMarkup(row.label)} ${stripInlineMarkup(row.description)}`.toLowerCase())
    .join(' ')

  if (!combined.trim()) return []

  if (/\bpath|file|directory|folder\b/.test(combined)) {
    return [
      {
        id: 'path',
        label: 'Path',
        description: 'Directory or file paths to target',
        type: 'directory-path',
        variadic: /\bone or more|multiple|paths\b/.test(combined),
        position: 0
      }
    ]
  }

  if (/\bbranch\b/.test(combined)) {
    return [
      {
        id: 'branch',
        label: 'Branch',
        description: 'Branch name',
        type: 'string',
        required: true,
        position: 0
      }
    ]
  }

  return []
}

export function buildCommandTreeFromReferenceHelp(
  sections: CommandReferenceHelpSections | undefined
): ReferenceHelpCommandTreeSuggestion | null {
  if (!sections) return null

  const mergedOptionRows = mergeOptionRows(
    (sections.commonOptions ?? []).flatMap((group) => group.rows.map((row) => ({ ...row })))
  )

  const options = mergedOptionRows
    .map((row) => buildOptionFromRow(row))
    .filter((option): option is CommandOption => Boolean(option))

  const positionalArgs = buildPositionalArgs(sections.arguments ?? [])

  if (options.length === 0 && positionalArgs.length === 0) {
    return null
  }

  return { options, positionalArgs }
}
