import { describe, expect, it } from 'vitest'
import { buildCommandTreeFromReferenceHelp } from './reference-help-command-tree'

describe('reference-help-command-tree', () => {
  it('converts structured help rows into builder options and path args', () => {
    const result = buildCommandTreeFromReferenceHelp({
      overview: 'List directory contents.',
      commonOptions: [
        {
          title: 'Common',
          rows: [
            { label: '`-a`', description: 'Show hidden files.' },
            { label: '`--all`', description: 'Same as -a.' },
            { label: '`-l`, `--long`', description: 'Use long format.' },
            { label: '`--color`', description: 'Colorize output.' }
          ]
        }
      ],
      arguments: [
        { label: 'One or more paths', description: 'Directory or file paths to list.' }
      ],
      examples: [],
      platformNotes: [],
      cautions: []
    })

    expect(result).not.toBeNull()
    expect(result?.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'all',
          short: '-a',
          long: '--all',
          type: 'boolean'
        }),
        expect.objectContaining({
          id: 'long',
          short: '-l',
          long: '--long',
          type: 'boolean'
        }),
        expect.objectContaining({
          id: 'color',
          long: '--color',
          type: 'enum'
        })
      ])
    )
    expect(result?.positionalArgs).toEqual([
      expect.objectContaining({
        id: 'path',
        variadic: true
      })
    ])
  })
})
