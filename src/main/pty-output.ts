import type { ShellIntegrationEvent } from '../shared/shell-integration'

export const SHELL_READY_MARKER = '\x1b]7337;ready\x07'
export const SHELL_READY_RE = /\x1b\]7337;ready\x07/g
export const SHELL_EVENT_RE = /\x1b\]7337;shell;([^;\x07]+)(?:;([^;\x07]*))?(?:;([^;\x07]*))?\x07/g
export const WORKFLOW_STEP_RESULT_RE = /\x1b\]7337;workflow-step;([^;\x07]+);([^;\x07]+);(-?\d+)\x07/g
export const MAX_OUTPUT_BUFFER_BYTES = 10 * 1024 * 1024
export const TARGET_OUTPUT_BUFFER_BYTES = 8 * 1024 * 1024

/**
 * Strip ANSI/xterm escape sequences from raw PTY output for clean log text.
 */
export function stripAnsi(raw: string): string {
  return raw
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')
    .replace(/\x1b\][^\x07]*\x07/g, '')
    .replace(/\x1b\][^\x1b]*\x1b\\/g, '')
    .replace(/\x1b[()][A-Z0-9]/g, '')
    .replace(/\x1b[>=]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '')
}

export function appendOutputChunk(
  outputBuffer: string[],
  outputBufferSize: number,
  chunk: string
): { outputBuffer: string[]; outputBufferSize: number } {
  const nextBuffer = [...outputBuffer, chunk]
  let nextSize = outputBufferSize + chunk.length

  if (nextSize > MAX_OUTPUT_BUFFER_BYTES) {
    while (nextSize > TARGET_OUTPUT_BUFFER_BYTES && nextBuffer.length > 1) {
      const dropped = nextBuffer.shift()!
      nextSize -= dropped.length
    }
  }

  return { outputBuffer: nextBuffer, outputBufferSize: nextSize }
}

function decodeShellPayload(payload: string | undefined): string | null {
  if (!payload) return null
  const decoded = Buffer.from(payload, 'base64').toString('utf8')
  return decoded.length > 0 ? decoded : null
}

export function extractShellIntegrationEvents(data: string): {
  data: string
  sawMarker: boolean
  events: ShellIntegrationEvent[]
} {
  let sawMarker = false
  const events: ShellIntegrationEvent[] = []
  let cleaned = data

  if (cleaned.includes(SHELL_READY_MARKER)) {
    sawMarker = true
    cleaned = cleaned.replace(SHELL_READY_RE, '')
  }

  cleaned = cleaned.replace(
    SHELL_EVENT_RE,
    (_match, type: string, payload1: string | undefined, payload2: string | undefined) => {
      if (type === 'prompt-ready') {
        sawMarker = true
        // New format: prompt-ready;EXIT_CODE;BASE64_CWD
        // Old format: prompt-ready;BASE64_CWD
        let exitCode: number | null = null
        let cwd: string | null = null
        if (payload2 !== undefined) {
          // New format — payload1 is exit code, payload2 is base64 cwd
          const parsed = parseInt(payload1 ?? '', 10)
          exitCode = Number.isFinite(parsed) ? parsed : null
          cwd = decodeShellPayload(payload2)
        } else {
          // Old format — payload1 is base64 cwd
          cwd = decodeShellPayload(payload1)
        }
        events.push({
          type: 'prompt-ready',
          cwd,
          exitCode,
          receivedAt: new Date().toISOString()
        })
        return ''
      }

      if (type === 'command-start') {
        const command = decodeShellPayload(payload1)
        if (command?.trim()) {
          events.push({
            type: 'command-start',
            command,
            receivedAt: new Date().toISOString()
          })
        }
        return ''
      }

      return ''
    }
  )

  if (!sawMarker && events.length === 0) {
    return { data, sawMarker: false, events: [] }
  }

  return {
    data: cleaned,
    sawMarker,
    events
  }
}

export function extractWorkflowStepResults(data: string): {
  data: string
  results: Array<{
    runId: string
    stepId: string
    exitCode: number
  }>
} {
  const results: Array<{
    runId: string
    stepId: string
    exitCode: number
  }> = []

  const cleaned = data.replace(
    WORKFLOW_STEP_RESULT_RE,
    (_match, runId: string, stepId: string, exitCodeRaw: string) => {
      results.push({
        runId,
        stepId,
        exitCode: Number(exitCodeRaw)
      })
      return ''
    }
  )

  return {
    data: cleaned,
    results
  }
}

export function prepareLogContent(outputBuffer: string[]): string | null {
  const content = stripAnsi(outputBuffer.join(''))
  return content.trim().length > 0 ? content : null
}
