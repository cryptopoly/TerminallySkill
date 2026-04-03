import { describe, expect, it } from 'vitest'
import {
  buildPromotionDefaultName,
  buildPromotedCommandDefinition,
  buildSavedCommandDefinition,
  extractPrimaryExecutable
} from './terminal-promotion'

describe('terminal-promotion', () => {
  it('extracts the first executable from a shell command', () => {
    expect(extractPrimaryExecutable('npm run build')).toBe('npm')
    expect(extractPrimaryExecutable('"./my tool" --watch')).toBe('./my tool')
    expect(extractPrimaryExecutable('  python3 -m pytest  ')).toBe('python3')
  })

  it('stops at shell control operators when finding the executable', () => {
    expect(extractPrimaryExecutable('git status && npm test')).toBe('git')
    expect(extractPrimaryExecutable('docker compose up | tee output.log')).toBe('docker')
  })

  it('builds readable default names for promoted artifacts', () => {
    expect(buildPromotionDefaultName('npm run package:mac', 'script')).toBe('Npm Run Package Mac')
    expect(buildPromotionDefaultName('openclaw gateway start', 'snippet')).toBe('Openclaw Gateway Start')
    expect(buildPromotionDefaultName('python3 -m pytest', 'command')).toBe('python3')
  })

  it('builds placeholder command definitions for promoted executables', () => {
    expect(buildPromotedCommandDefinition('npm', 'npm run build')).toMatchObject({
      id: 'manual-npm',
      name: 'npm',
      executable: 'npm',
      category: 'npm',
      source: 'manual',
      installed: true,
      enriched: false
    })
  })

  it('builds saved command presets that carry preset values and drop root-only tags', () => {
    const saved = buildSavedCommandDefinition(
      {
        id: 'builtin-chmod-root',
        name: 'chmod',
        executable: 'chmod',
        description: 'Apply file permissions',
        category: 'chmod',
        source: 'builtin',
        installed: true,
        enriched: true,
        tags: ['cli-root']
      },
      'chmod -r /etc/passwd',
      { recursive: true, file: '/etc/passwd' }
    )

    expect(saved).toMatchObject({
      name: 'chmod -r /etc/passwd',
      executable: 'chmod',
      category: 'chmod',
      source: 'manual',
      installed: true,
      enriched: true,
      description: 'Saved preset for chmod',
      tags: ['saved-command'],
      presetValues: { recursive: true, file: '/etc/passwd' }
    })
  })
})
