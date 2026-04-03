import { describe, expect, it } from 'vitest'
import {
  findCLIInstallCatalogEntry,
  getInstallRecipesForPlatform,
  getPrimaryInstallRecipe,
  searchCLIInstallCatalog
} from './cli-install-catalog'

describe('cli-install-catalog', () => {
  it('can resolve entries by alias', () => {
    const entry = findCLIInstallCatalogEntry('python3')
    expect(entry?.executable).toBe('python')
  })

  it('returns platform-specific install recipes', () => {
    const entry = findCLIInstallCatalogEntry('uv')
    expect(entry).not.toBeNull()
    expect(getInstallRecipesForPlatform(entry!, 'linux')[0]?.command).toContain('astral.sh/uv')
    expect(getPrimaryInstallRecipe(entry!, 'macos')?.command).toBe('brew install uv')
  })

  it('prioritizes exact executable matches above looser description matches', () => {
    const results = searchCLIInstallCatalog('git', 'macos', 5)
    expect(results[0]?.executable).toBe('git')
  })

  it('returns popular entries when searching with an empty query', () => {
    const results = searchCLIInstallCatalog('', 'linux', 20)
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((entry) => entry.install.linux?.length)).toBe(true)
  })
})
