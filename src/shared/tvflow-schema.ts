import type { WorkflowDefinition } from './workflow-schema'

export interface TVFlowStep {
  commandString: string
  label: string
  continueOnError: boolean
  delayMs: number
  enabled: boolean
}

export interface LegacyTVFlowFile {
  version: '1.0'
  type: 'script'
  exportedAt: string
  script: {
    name: string
    description: string
    tags: string[]
    steps: TVFlowStep[]
  }
}

export interface WorkflowTVFlowFile {
  version: '2.0'
  type: 'workflow'
  exportedAt: string
  workflow: WorkflowDefinition
}

export type TVFlowFile = LegacyTVFlowFile | WorkflowTVFlowFile

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isLegacyTVFlowFile(flow: TVFlowFile): flow is LegacyTVFlowFile {
  return flow.type === 'script'
}

export function isWorkflowTVFlowFile(flow: TVFlowFile): flow is WorkflowTVFlowFile {
  return flow.type === 'workflow'
}

export function isTVFlowFile(value: unknown): value is TVFlowFile {
  if (!isRecord(value) || typeof value.version !== 'string' || typeof value.type !== 'string') {
    return false
  }

  if (value.version === '1.0' && value.type === 'script') {
    return isRecord(value.script)
  }

  if (value.version === '2.0' && value.type === 'workflow') {
    return isRecord(value.workflow)
  }

  return false
}

export function getTVFlowName(flow: TVFlowFile): string {
  return isWorkflowTVFlowFile(flow) ? flow.workflow.name : flow.script.name
}
