import { describe, expect, it } from 'vitest'
import type { Snippet } from '../shared/snippet-schema'
import {
  applySnippetUpdates,
  createSnippetRecord,
  duplicateSnippetRecord
} from './snippet-persistence'

describe('snippet-persistence', () => {
  it('creates snippets with parsed variables and default metadata', () => {
    const snippet = createSnippetRecord(
      {
        name: 'SSH',
        template: 'ssh {{user:root}}@{{host}}',
        projectId: 'proj-1'
      },
      '2026-03-08T16:40:00.000Z',
      () => 'snippet-1'
    )

    expect(snippet).toEqual({
      id: 'snippet-1',
      name: 'SSH',
      template: 'ssh {{user:root}}@{{host}}',
      description: '',
      projectId: 'proj-1',
      variables: [
        { name: 'user', label: 'User', defaultValue: 'root' },
        { name: 'host', label: 'Host', defaultValue: '' }
      ],
      tags: [],
      createdAt: '2026-03-08T16:40:00.000Z',
      updatedAt: '2026-03-08T16:40:00.000Z',
      lastRunAt: null
    })
  })

  it('re-parses variables when the template changes', () => {
    const original: Snippet = {
      id: 'snippet-1',
      name: 'SSH',
      template: 'ssh {{host}}',
      description: '',
      projectId: null,
      variables: [{ name: 'host', label: 'Host', defaultValue: '' }],
      tags: [],
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      lastRunAt: null
    }

    const updated = applySnippetUpdates(
      original,
      { template: 'ssh {{user:root}}@{{host}}', tags: ['remote'] },
      '2026-03-08T16:41:00.000Z'
    )

    expect(updated.template).toBe('ssh {{user:root}}@{{host}}')
    expect(updated.variables).toEqual([
      { name: 'user', label: 'User', defaultValue: 'root' },
      { name: 'host', label: 'Host', defaultValue: '' }
    ])
    expect(updated.tags).toEqual(['remote'])
    expect(updated.updatedAt).toBe('2026-03-08T16:41:00.000Z')
  })

  it('duplicates snippets with fresh ids and a reset run timestamp', () => {
    const original: Snippet = {
      id: 'snippet-1',
      name: 'SSH',
      template: 'ssh {{host}}',
      description: 'Connect',
      projectId: 'proj-1',
      variables: [{ name: 'host', label: 'Host', defaultValue: '' }],
      tags: ['remote'],
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-02T00:00:00.000Z',
      lastRunAt: '2026-03-03T00:00:00.000Z'
    }

    const copy = duplicateSnippetRecord(
      original,
      '2026-03-08T16:42:00.000Z',
      () => 'snippet-copy'
    )

    expect(copy.id).toBe('snippet-copy')
    expect(copy.name).toBe('SSH (Copy)')
    expect(copy.template).toBe('ssh {{host}}')
    expect(copy.variables).toEqual([{ name: 'host', label: 'Host', defaultValue: '' }])
    expect(copy.createdAt).toBe('2026-03-08T16:42:00.000Z')
    expect(copy.updatedAt).toBe('2026-03-08T16:42:00.000Z')
    expect(copy.lastRunAt).toBeNull()
  })
})
