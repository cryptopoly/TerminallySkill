import type { Snippet } from '../shared/snippet-schema'
import { parseTemplateVariables } from '../shared/snippet-schema'

export function createSnippetRecord(
  params: {
    name: string
    template: string
    projectId: string | null
    description?: string
  },
  now: string,
  makeId: () => string
): Snippet {
  return {
    id: makeId(),
    name: params.name,
    template: params.template,
    description: params.description || '',
    projectId: params.projectId,
    variables: parseTemplateVariables(params.template),
    tags: [],
    createdAt: now,
    updatedAt: now,
    lastRunAt: null
  }
}

export function applySnippetUpdates(
  snippet: Snippet,
  updates: Partial<Pick<Snippet, 'name' | 'description' | 'template' | 'tags'>>,
  now: string
): Snippet {
  const updated: Snippet = {
    ...snippet,
    ...updates,
    updatedAt: now
  }

  if (updates.template !== undefined) {
    updated.variables = parseTemplateVariables(updated.template)
  }

  return updated
}

export function duplicateSnippetRecord(
  original: Snippet,
  now: string,
  makeId: () => string
): Snippet {
  return {
    ...JSON.parse(JSON.stringify(original)),
    id: makeId(),
    name: `${original.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
    lastRunAt: null
  }
}
