export interface ExitDiagnosticInput {
  title?: string | null
  commandString?: string | null
  exitCode: number | null
  error?: string | null
  shell?: string | null
}

export interface ExitDiagnostics {
  summary: string
  suspectedIssues: string[]
  nextChecks: string[]
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))]
}

function buildGenericSuspicions(exitCode: number): string[] {
  switch (exitCode) {
    case 1:
      return [
        'The command ran but hit a generic failure, so the real cause is usually in the command output just above this error.',
        'A preceding build, packaging, or validation step may have failed before the wrapper command exited.'
      ]
    case 126:
      return [
        'The target file or command exists, but it is not executable or the shell does not have permission to run it.',
        'This can also happen when a script has the wrong interpreter or line endings.'
      ]
    case 127:
      return [
        'The shell could not find the command in PATH.',
        'A required tool may not be installed in this environment or the executable name may be wrong.'
      ]
    case 130:
      return [
        'The process was interrupted, usually by Ctrl+C or a cancelled terminal session.'
      ]
    case 137:
      return [
        'The process was killed abruptly, often because it ran out of memory or received SIGKILL.'
      ]
    case 143:
      return [
        'The process was terminated by SIGTERM, often because another process or supervisor stopped it.'
      ]
    default:
      return [
        'The exit code indicates the command failed, but the exact cause depends on the command output and environment.'
      ]
  }
}

function buildGenericChecks(exitCode: number, shell?: string | null): string[] {
  const checks = [
    'Open the linked log or full command output and look for the first error line above the exit code.',
    'Re-run the failing command by itself to separate wrapper failures from the real underlying issue.'
  ]

  if (exitCode === 127) {
    checks.push('Check PATH and verify the missing executable is installed in this shell environment.')
  }

  if (exitCode === 126) {
    checks.push('Check file permissions, shebang, and whether the script needs chmod +x.')
  }

  if (shell) {
    checks.push(`Confirm the command behaves the same in ${shell}.`)
  }

  return unique(checks)
}

function buildCommandSpecificSuspicions(command: string, error?: string | null): string[] {
  const normalized = command.toLowerCase()
  const normalizedError = error?.toLowerCase() ?? ''
  const issues: string[] = []

  if (normalized.includes('npm run package:mac') || normalized.includes('electron-builder --mac')) {
    issues.push(
      'mac packaging commonly fails because of code-signing, notarization, or missing Apple certificate setup.',
      'The Electron build may be missing an app icon, bundle metadata, or another required electron-builder config value.',
      'A normal build step may have failed earlier, and the packaging wrapper is only surfacing the final exit code.'
    )
  }

  if (normalized.includes('npm run build') || normalized.includes('vite build') || normalized.includes('tsc')) {
    issues.push(
      'Compile-time failures such as TypeScript errors, unresolved imports, or environment-variable assumptions are common here.',
      'A config file change may have broken the bundler, transpiler, or output path.'
    )
  }

  if (normalized.startsWith('npm ') || normalized.includes(' npm ')) {
    issues.push(
      'The npm script may be failing inside package.json, so the root issue is often in the script it launches rather than npm itself.',
      'Node version mismatches, missing dependencies, or stale lockfile state can also surface as a plain exit code 1.'
    )
  }

  if (normalized.includes('.sh') || normalized.startsWith('bash ') || normalized.startsWith('sh ')) {
    issues.push(
      'Shell scripts often fail because of missing execute permissions, bad relative paths, or an unexpected current working directory.'
    )
  }

  if (normalized.startsWith('python') || normalized.includes(' python')) {
    issues.push(
      'Python command failures are often missing modules, the wrong virtual environment, or interpreter mismatches.'
    )
  }

  if (normalizedError.includes('codesign') || normalizedError.includes('notar')) {
    issues.unshift('The error message already points at Apple signing/notarization as the likely cause.')
  }

  if (normalizedError.includes('command not found')) {
    issues.unshift('The shell output suggests a missing executable in PATH.')
  }

  return unique(issues)
}

function buildCommandSpecificChecks(command: string): string[] {
  const normalized = command.toLowerCase()
  const checks: string[] = []

  if (normalized.includes('package:mac') || normalized.includes('electron-builder --mac')) {
    checks.push(
      'Check electron-builder config, app icons, signing settings, and whether the packaging step expects Apple credentials.',
      'Look for the first packaging-related error line in the build output, not just the final npm failure.'
    )
  }

  if (normalized.startsWith('npm ') || normalized.includes(' npm ')) {
    checks.push(
      'Open package.json and inspect the exact script behind this npm command.',
      'Try the underlying build or packaging command directly without npm to get a cleaner error.'
    )
  }

  return unique(checks)
}

export function buildExitDiagnostics(input: ExitDiagnosticInput): ExitDiagnostics | null {
  if (input.exitCode === null) return null

  const summary =
    input.exitCode === 0
      ? 'The command exited successfully.'
      : input.commandString
        ? `${input.commandString} exited with code ${input.exitCode}.`
        : `${input.title ?? 'This command'} exited with code ${input.exitCode}.`

  const suspectedIssues = unique([
    ...buildGenericSuspicions(input.exitCode),
    ...(input.commandString ? buildCommandSpecificSuspicions(input.commandString, input.error) : [])
  ])

  const nextChecks = unique([
    ...buildGenericChecks(input.exitCode, input.shell),
    ...(input.commandString ? buildCommandSpecificChecks(input.commandString) : [])
  ])

  return {
    summary,
    suspectedIssues,
    nextChecks
  }
}
