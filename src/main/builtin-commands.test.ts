import { describe, expect, it } from 'vitest'
import { readdir, readFile } from 'fs/promises'
import { join, extname } from 'path'
import type { CommandDefinition } from '../shared/command-schema'

async function loadCommandFiles(dir: string): Promise<CommandDefinition[]> {
  const definitions: CommandDefinition[] = []
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      definitions.push(...(await loadCommandFiles(fullPath)))
      continue
    }

    if (!entry.isFile() || extname(entry.name) !== '.json') continue
    const raw = await readFile(fullPath, 'utf-8')
    definitions.push(JSON.parse(raw) as CommandDefinition)
  }

  return definitions
}

describe('builtin command definitions', () => {
  it('load as valid JSON with unique ids and include the seeded ecosystem categories', async () => {
    const definitions = await loadCommandFiles(join(process.cwd(), 'commands'))
    const ids = definitions.map((definition) => definition.id)
    const categories = new Set(definitions.map((definition) => definition.category))

    expect(definitions.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
    expect(definitions.every((definition) =>
      Boolean(definition.id && definition.name && definition.executable && definition.category)
    )).toBe(true)
    expect(categories.has('python')).toBe(true)
    expect(categories.has('rust')).toBe(true)
    expect(categories.has('go')).toBe(true)
  })
})
