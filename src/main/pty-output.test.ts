import { describe, expect, it } from 'vitest'
import {
  MAX_OUTPUT_BUFFER_BYTES,
  SHELL_READY_MARKER,
  TARGET_OUTPUT_BUFFER_BYTES,
  appendOutputChunk,
  extractShellIntegrationEvents,
  extractWorkflowStepResults,
  prepareLogContent,
  stripAnsi,
} from './pty-output'

describe('pty-output', () => {
  it('strips ANSI escapes and normalizes carriage returns', () => {
    expect(
      stripAnsi('\u001b[31merror\u001b[0m\r\nline 2\r\u001b]7337;ready\u0007')
    ).toBe('error\nline 2')
  })

  it('extracts shell integration events and removes their markers from output', () => {
    const promptPayload = Buffer.from('/tmp/app').toString('base64')
    const commandPayload = Buffer.from('npm test').toString('base64')

    const extracted = extractShellIntegrationEvents(
      `before${SHELL_READY_MARKER}\x1b]7337;shell;command-start;${commandPayload}\x07` +
        `middle\x1b]7337;shell;prompt-ready;0;${promptPayload}\x07after`
    )

    expect(extracted.data).toBe('beforemiddleafter')
    expect(extracted.sawMarker).toBe(true)
    expect(extracted.events).toHaveLength(2)
    expect(extracted.events[0]).toMatchObject({
      type: 'command-start',
      command: 'npm test'
    })
    expect(extracted.events[1]).toMatchObject({
      type: 'prompt-ready',
      cwd: '/tmp/app',
      exitCode: 0
    })
  })

  it('extracts prompt-ready with non-zero exit code', () => {
    const cwdPayload = Buffer.from('/home/user').toString('base64')
    const extracted = extractShellIntegrationEvents(
      `\x1b]7337;shell;prompt-ready;127;${cwdPayload}\x07`
    )
    expect(extracted.events).toHaveLength(1)
    expect(extracted.events[0]).toMatchObject({
      type: 'prompt-ready',
      cwd: '/home/user',
      exitCode: 127
    })
  })

  it('handles legacy prompt-ready format without exit code', () => {
    const cwdPayload = Buffer.from('/tmp').toString('base64')
    const extracted = extractShellIntegrationEvents(
      `\x1b]7337;shell;prompt-ready;${cwdPayload}\x07`
    )
    expect(extracted.events).toHaveLength(1)
    expect(extracted.events[0]).toMatchObject({
      type: 'prompt-ready',
      cwd: '/tmp',
      exitCode: null
    })
  })

  it('leaves plain output untouched when no shell markers are present', () => {
    expect(extractShellIntegrationEvents('plain output')).toEqual({
      data: 'plain output',
      sawMarker: false,
      events: []
    })
  })

  it('extracts workflow step-result markers without leaking them into terminal output', () => {
    expect(
      extractWorkflowStepResults(
        `before\x1b]7337;workflow-step;run-1;step-2;17\x07after`
      )
    ).toEqual({
      data: 'beforeafter',
      results: [
        {
          runId: 'run-1',
          stepId: 'step-2',
          exitCode: 17
        }
      ]
    })
  })

  it('caps the buffered output by dropping old chunks once the limit is exceeded', () => {
    const chunks = [
      'a'.repeat(4 * 1024 * 1024),
      'b'.repeat(4 * 1024 * 1024),
      'c'.repeat(3 * 1024 * 1024)
    ]

    let state = { outputBuffer: [] as string[], outputBufferSize: 0 }
    for (const chunk of chunks) {
      state = appendOutputChunk(state.outputBuffer, state.outputBufferSize, chunk)
    }

    expect(state.outputBufferSize).toBeLessThanOrEqual(MAX_OUTPUT_BUFFER_BYTES)
    expect(state.outputBufferSize).toBeLessThanOrEqual(TARGET_OUTPUT_BUFFER_BYTES)
    expect(state.outputBuffer).toHaveLength(2)
    expect(state.outputBuffer[0][0]).toBe('b')
    expect(state.outputBuffer[1][0]).toBe('c')
  })

  it('returns null for empty log content after stripping control sequences', () => {
    expect(prepareLogContent(['\u001b[31m\u001b[0m', '\r', SHELL_READY_MARKER])).toBeNull()
    expect(prepareLogContent(['ok\r\n'])).toBe('ok\n')
  })
})
