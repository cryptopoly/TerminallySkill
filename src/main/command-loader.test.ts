import { describe, expect, it } from 'vitest'
import type { CommandDefinition } from '../shared/command-schema'
import { selectPreferredLoadedDefinition } from './command-loader-utils'

describe('command-loader selection', () => {
  it('prefers richer enriched definitions over minimal roots', () => {
    const minimalRoot: CommandDefinition = {
      id: 'builtin-ls-root',
      name: 'ls',
      executable: 'ls',
      description: 'ls command-line tool',
      category: 'ls',
      source: 'builtin',
      installed: true,
      enriched: true,
      tags: ['cli-root']
    }

    const enrichedRoot: CommandDefinition = {
      ...minimalRoot,
      description: 'List directory contents, displaying files and subdirectories with optional detail formatting',
      options: [
        {
          id: 'long',
          short: '-l',
          label: 'Long format',
          type: 'boolean'
        }
      ],
      positionalArgs: [
        {
          id: 'path',
          label: 'Path',
          type: 'directory-path',
          variadic: true,
          position: 0
        }
      ]
    }

    expect(selectPreferredLoadedDefinition(minimalRoot, enrichedRoot)).toEqual(enrichedRoot)
  })

  it('prefers the later saved preset when keys are otherwise equivalent', () => {
    const earlierPreset: CommandDefinition = {
      id: 'saved-ls-1',
      name: 'ls -l',
      executable: 'ls',
      description: 'Saved preset for ls',
      category: 'ls',
      source: 'manual',
      installed: true,
      enriched: true,
      tags: ['saved-command'],
      presetValues: {
        long: true
      }
    }

    const laterPreset: CommandDefinition = {
      ...earlierPreset,
      presetValues: {
        long: true,
        all: true
      }
    }

    expect(selectPreferredLoadedDefinition(earlierPreset, laterPreset)).toEqual(laterPreset)
  })
})
