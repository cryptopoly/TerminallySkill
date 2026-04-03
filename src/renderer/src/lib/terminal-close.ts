import {
  isTerminalRunStatus,
  type WorkflowActiveRun
} from '../store/workflow-runner-store'

export async function confirmTerminalClose(
  sessionId: string,
  runsBySession: Record<string, WorkflowActiveRun>
): Promise<boolean> {
  const run = runsBySession[sessionId] ?? null
  const hasActiveWorkflowRun = Boolean(run && !isTerminalRunStatus(run.status))
  const sessionInfo = await window.electronAPI.getSessionInfo(sessionId)
  const shellIsExecuting = sessionInfo?.shellState === 'executing'

  if (!hasActiveWorkflowRun && !shellIsExecuting) {
    return true
  }

  const reasons: string[] = []
  if (hasActiveWorkflowRun) {
    reasons.push(`Workflow "${run?.script.name ?? 'Unknown Script'}" is still running.`)
  }
  if (shellIsExecuting) {
    reasons.push('This terminal is still executing a command.')
  }

  return window.confirm(
    `Close this terminal anyway?\n\n${reasons.join('\n')}`
  )
}
