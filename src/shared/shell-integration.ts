export interface ShellPromptReadyEvent {
  type: 'prompt-ready'
  cwd: string | null
  exitCode: number | null
  receivedAt: string
}

export interface ShellCommandStartEvent {
  type: 'command-start'
  command: string
  receivedAt: string
}

export type ShellIntegrationEvent = ShellPromptReadyEvent | ShellCommandStartEvent
