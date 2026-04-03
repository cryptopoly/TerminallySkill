import { describe, expect, it } from 'vitest'
import type { WorkflowStepResultEvent } from './workflow-shell'

describe('workflow-shell', () => {
  it('exports a WorkflowStepResultEvent type with runId, stepId, and exitCode', () => {
    const event: WorkflowStepResultEvent = {
      runId: 'wf-run-1',
      stepId: 'step-2',
      exitCode: 0
    }

    expect(event.runId).toBe('wf-run-1')
    expect(event.stepId).toBe('step-2')
    expect(event.exitCode).toBe(0)
  })
})
