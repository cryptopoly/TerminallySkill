import { describe, expect, it } from 'vitest'
import { buildExitDiagnostics } from './exit-diagnostics'

describe('buildExitDiagnostics', () => {
  it('adds packaging-specific hints for npm mac packaging failures', () => {
    const diagnostics = buildExitDiagnostics({
      commandString: 'npm run package:mac',
      exitCode: 1,
      error: 'npm run package:mac failed with exit code 1.',
      shell: '/bin/zsh'
    })

    expect(diagnostics).not.toBeNull()
    expect(diagnostics?.suspectedIssues.join('\n')).toMatch(/code-signing|notarization|Apple/i)
    expect(diagnostics?.nextChecks.join('\n')).toMatch(/package\.json|electron-builder/i)
  })

  it('explains command not found failures', () => {
    const diagnostics = buildExitDiagnostics({
      commandString: 'foo-cli build',
      exitCode: 127,
      shell: '/bin/zsh'
    })

    expect(diagnostics?.suspectedIssues.join('\n')).toMatch(/path|installed/i)
    expect(diagnostics?.nextChecks.join('\n')).toMatch(/PATH/)
  })

  it('returns null when no exit code exists', () => {
    expect(
      buildExitDiagnostics({
        commandString: 'npm run build',
        exitCode: null
      })
    ).toBeNull()
  })
})
