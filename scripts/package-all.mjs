import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')

function run(command, commandArgs) {
  const pretty = [command, ...commandArgs].join(' ')
  console.log(`\n> ${pretty}`)

  if (isDryRun) {
    return 0
  }

  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })

  return result.status ?? 1
}

function exitWithHelp(message, code = 1) {
  console.error(message)
  process.exit(code)
}

const hostTargets = {
  darwin: ['package:mac'],
  linux: ['package:linux'],
  win32: ['package:win']
}

const scripts = hostTargets[process.platform]

if (!scripts) {
  exitWithHelp(`Unsupported host platform for package:all: ${process.platform}`)
}

console.log(`package:all is host-safe on ${process.platform}.`)

if (process.platform === 'darwin') {
  console.log('Building the macOS x64 + arm64 package set on this Mac host.')
  console.log('Linux and Windows targets still need their own host or CI runner because node-pty cannot cross-compile here.')
} else if (process.platform === 'linux') {
  console.log('Building the Linux package set on this Linux host.')
  console.log('macOS and Windows targets still need their own host or CI runner because native rebuilds are host-specific.')
} else if (process.platform === 'win32') {
  console.log('Building the Windows package set on this Windows host.')
  console.log('macOS and Linux targets still need their own host or CI runner because native rebuilds are host-specific.')
}

for (const script of scripts) {
  const code = run('npm', ['run', script])
  if (code !== 0) {
    process.exit(code)
  }
}

if (isDryRun) {
  console.log('\nDry run complete.')
}
