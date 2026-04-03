import type {
  WorkflowApprovalStep,
  WorkflowCommandStep,
  WorkflowInputDefinition,
  WorkflowNoteStep
} from './workflow-schema'

export interface Script {
  id: string
  /** Display name for the script */
  name: string
  /** Optional description of what this script does */
  description: string
  /** Typed inputs referenced by workflow steps via {{inputId}} */
  inputs: WorkflowInputDefinition[]
  /** Ordered list of commands in this script */
  steps: ScriptStep[]
  /** Project ID this script belongs to (null = global) */
  projectId: string | null
  /** Original shared or foreign script this project-local clone came from */
  sourceScriptId: string | null
  /** Tags for search/filtering */
  tags: string[]
  /** When the script was created */
  createdAt: string
  /** When the script was last modified */
  updatedAt: string
  /** When the script was last executed */
  lastRunAt: string | null
}

export type ScriptCommandStep = WorkflowCommandStep
export type ScriptApprovalStep = WorkflowApprovalStep
export type ScriptNoteStep = WorkflowNoteStep
export type ScriptStep = ScriptCommandStep | ScriptApprovalStep | ScriptNoteStep

export function isScriptCommandStep(step: ScriptStep): step is ScriptCommandStep {
  return step.type === 'command'
}

export function isScriptApprovalStep(step: ScriptStep): step is ScriptApprovalStep {
  return step.type === 'approval'
}

export function isScriptNoteStep(step: ScriptStep): step is ScriptNoteStep {
  return step.type === 'note'
}

export interface ScriptsData {
  scripts: Script[]
}
