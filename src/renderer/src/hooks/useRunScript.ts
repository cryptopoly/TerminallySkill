import { useCallback, useState } from 'react'
import { useProjectStore } from '../store/project-store'
import { useTerminalStore } from '../store/terminal-store'
import { useWorkflowRunnerStore } from '../store/workflow-runner-store'
import { useScriptStore } from '../store/script-store'
import { buildScriptExecutionPlan } from '../../../shared/workflow-execution'
import { createProjectTerminalSession } from '../lib/workspace-session'
import type { WorkflowInputValues } from '../../../shared/workflow-execution'

/**
 * Shared hook for running/rerunning a script by ID from anywhere in the UI.
 * Always opens a fresh terminal session so it never clobbers an in-progress run.
 */
export function useRunScript(): {
  runScript: (scriptId: string, inputValues?: WorkflowInputValues) => Promise<void>
  runningScriptId: string | null
  canRunScript: (scriptId: string) => boolean
} {
  const [runningScriptId, setRunningScriptId] = useState<string | null>(null)
  const activeProject = useProjectStore((s) => s.activeProject)
  const scripts = useScriptStore((s) => s.scripts)
  const { addSession, setTerminalVisible } = useTerminalStore()
  const startWorkflowRun = useWorkflowRunnerStore((s) => s.startRun)

  const canRunScript = useCallback(
    (scriptId: string) => scripts.some((s) => s.id === scriptId),
    [scripts]
  )

  const runScript = useCallback(
    async (scriptId: string, inputValues: WorkflowInputValues = {}) => {
      const script = scripts.find((s) => s.id === scriptId)
      if (!script) return

      const plan = buildScriptExecutionPlan(script, { inputValues })
      if (plan.steps.length === 0) return

      setRunningScriptId(scriptId)
      try {
        const envOverrides = useProjectStore.getState().getActiveEnvOverrides()
        const sessionId = await createProjectTerminalSession(activeProject, addSession, envOverrides)
        setTerminalVisible(true)
        startWorkflowRun({ script, sessionId, inputValues })
      } finally {
        setRunningScriptId(null)
      }
    },
    [activeProject, addSession, scripts, setTerminalVisible, startWorkflowRun]
  )

  return { runScript, runningScriptId, canRunScript }
}
