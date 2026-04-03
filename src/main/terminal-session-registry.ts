const activeTerminalSessions = new Set<string>()

export function registerTerminalSession(sessionId: string): void {
  activeTerminalSessions.add(sessionId)
}

export function unregisterTerminalSession(sessionId: string): void {
  activeTerminalSessions.delete(sessionId)
}

export function hasTerminalSession(sessionId: string): boolean {
  return activeTerminalSessions.has(sessionId)
}

export function resetTerminalSessionRegistry(): void {
  activeTerminalSessions.clear()
}
