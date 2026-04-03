import { describe, expect, it } from 'vitest'
import { recordRecentCommand, toggleFavoriteCommandIds } from './project-behavior'

describe('project-behavior', () => {
  it('toggles favorite ids on and off without mutating unrelated entries', () => {
    expect(toggleFavoriteCommandIds(['git-status'], 'docker-ps')).toEqual([
      'git-status',
      'docker-ps'
    ])
    expect(toggleFavoriteCommandIds(['git-status', 'docker-ps'], 'git-status')).toEqual([
      'docker-ps'
    ])
  })

  it('records recent commands by moving duplicates to the front and enforcing the cap', () => {
    const recent = Array.from({ length: 30 }, (_, index) => ({
      commandId: `cmd-${index}`,
      commandString: `command ${index}`,
      timestamp: `t${index}`
    }))

    const updated = recordRecentCommand(
      recent,
      'cmd-new',
      'command 10',
      't-new'
    )

    expect(updated).toHaveLength(30)
    expect(updated[0]).toEqual({
      commandId: 'cmd-new',
      commandString: 'command 10',
      timestamp: 't-new'
    })
    expect(updated.filter((entry) => entry.commandString === 'command 10')).toHaveLength(1)
    expect(updated[29].commandString).toBe('command 29')
  })
})
