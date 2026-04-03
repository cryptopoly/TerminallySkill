export type WorkflowInputType = 'string' | 'number' | 'boolean' | 'choice'

export interface WorkflowChoiceOption {
  label: string
  value: string
}

interface WorkflowInputDefinitionBase<TType extends WorkflowInputType, TDefault> {
  id: string
  label: string
  description: string
  type: TType
  required: boolean
  defaultValue?: TDefault
}

export interface StringWorkflowInputDefinition
  extends WorkflowInputDefinitionBase<'string', string> {
  placeholder: string
}

export interface NumberWorkflowInputDefinition
  extends WorkflowInputDefinitionBase<'number', number> {
  min?: number
  max?: number
  step?: number
}

export interface BooleanWorkflowInputDefinition
  extends WorkflowInputDefinitionBase<'boolean', boolean> {}

export interface ChoiceWorkflowInputDefinition
  extends WorkflowInputDefinitionBase<'choice', string> {
  options: WorkflowChoiceOption[]
  allowCustomValue: boolean
}

export type WorkflowInputDefinition =
  | StringWorkflowInputDefinition
  | NumberWorkflowInputDefinition
  | BooleanWorkflowInputDefinition
  | ChoiceWorkflowInputDefinition

export type WorkflowStepType = 'command' | 'approval' | 'note'

interface WorkflowStepDefinitionBase<TType extends WorkflowStepType> {
  type: TType
  label: string
  enabled: boolean
}

export interface WorkflowCommandStepDefinition
  extends WorkflowStepDefinitionBase<'command'> {
  commandString: string
  continueOnError: boolean
  delayMs: number
  retryCount: number
}

export interface WorkflowApprovalStepDefinition
  extends WorkflowStepDefinitionBase<'approval'> {
  message: string
  requireConfirmation: boolean
}

export interface WorkflowNoteStepDefinition extends WorkflowStepDefinitionBase<'note'> {
  content: string
}

export type WorkflowStepDefinition =
  | WorkflowCommandStepDefinition
  | WorkflowApprovalStepDefinition
  | WorkflowNoteStepDefinition

export type WorkflowCommandStep = WorkflowCommandStepDefinition & {
  id: string
  commandId: string | null
}

export type WorkflowApprovalStep = WorkflowApprovalStepDefinition & {
  id: string
}

export type WorkflowNoteStep = WorkflowNoteStepDefinition & {
  id: string
}

export type WorkflowStep = WorkflowCommandStep | WorkflowApprovalStep | WorkflowNoteStep

interface WorkflowBase {
  name: string
  description: string
  tags: string[]
  inputs: WorkflowInputDefinition[]
}

export interface WorkflowDefinition extends WorkflowBase {
  steps: WorkflowStepDefinition[]
}

export interface Workflow extends WorkflowBase {
  id: string
  projectId: string | null
  steps: WorkflowStep[]
  createdAt: string
  updatedAt: string
  lastRunAt: string | null
}
