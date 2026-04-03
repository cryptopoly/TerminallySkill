export interface SnippetVariable {
  /** Variable name extracted from {{name}} */
  name: string
  /** Human-readable label for the input */
  label: string
  /** Default value from {{name:default}} syntax, or empty string */
  defaultValue: string
}

export interface Snippet {
  id: string
  /** Display name */
  name: string
  /** Command template with {{variable}} placeholders */
  template: string
  /** Optional description */
  description: string
  /** Project ID this snippet belongs to (null = global) */
  projectId: string | null
  /** Parsed variables (kept in sync with template) */
  variables: SnippetVariable[]
  /** Tags for search/filtering */
  tags: string[]
  createdAt: string
  updatedAt: string
  lastRunAt: string | null
}

export interface SnippetsData {
  snippets: Snippet[]
}

/** Regex for {{varName}} or {{varName:defaultValue}} */
const VAR_REGEX = /\{\{(\w+)(?::([^}]*))?\}\}/g

/** Parse template string to extract unique variables in order of appearance */
export function parseTemplateVariables(template: string): SnippetVariable[] {
  const vars: SnippetVariable[] = []
  const seen = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = VAR_REGEX.exec(template)) !== null) {
    const name = match[1]
    if (seen.has(name)) continue
    seen.add(name)
    // Derive label: camelCase → spaced, snake_case → spaced, then title-case
    const label = name
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
    vars.push({ name, label, defaultValue: match[2] ?? '' })
  }
  return vars
}

/** Replace {{var}} and {{var:default}} with provided values (falls back to default) */
export function resolveTemplate(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(VAR_REGEX, (_, name: string, defaultVal?: string) => {
    return values[name] ?? defaultVal ?? ''
  })
}
