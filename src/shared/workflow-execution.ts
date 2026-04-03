import type { Script, ScriptApprovalStep, ScriptCommandStep, ScriptNoteStep } from './script-schema'
import { scriptToWorkflowDefinition } from './workflow-adapter'
import type {
  WorkflowApprovalStepDefinition,
  WorkflowCommandStepDefinition,
  WorkflowDefinition,
  WorkflowInputDefinition,
  WorkflowNoteStepDefinition
} from './workflow-schema'
import {
  getUnknownWorkflowPlaceholders,
  getWorkflowInputInitialValue
} from './workflow-validation'

interface BuildExecutionPlanOptions {
  fromIndex?: number
  singleOnly?: boolean
  inputValues?: WorkflowInputValues
}

export interface WorkflowExecutionStep extends WorkflowCommandStepDefinition {
  sourceIndex: number
}

export interface WorkflowExecutionPlan {
  steps: WorkflowExecutionStep[]
  compoundCommand: string
}

export type ScriptRunStep =
  | (ScriptCommandStep & { sourceIndex: number })
  | (ScriptApprovalStep & { sourceIndex: number })
  | (ScriptNoteStep & { sourceIndex: number })

export type WorkflowPreparationStep =
  | (WorkflowApprovalStepDefinition & { sourceIndex: number })
  | (WorkflowNoteStepDefinition & { sourceIndex: number })

export type WorkflowInputValue = string | number | boolean
export type WorkflowInputValues = Record<string, WorkflowInputValue | undefined>

function normalizeInputValue(input: WorkflowInputDefinition, value: WorkflowInputValue | undefined): string {
  if (value === undefined) return ''
  if (input.type === 'boolean') {
    return value ? 'true' : 'false'
  }
  return String(value)
}

export function getWorkflowInputInitialValues(
  inputs: WorkflowInputDefinition[]
): WorkflowInputValues {
  return Object.fromEntries(inputs.map((input) => [input.id, getWorkflowInputInitialValue(input)]))
}

export function resolveWorkflowTemplate(
  template: string,
  inputs: WorkflowInputDefinition[],
  values: WorkflowInputValues = {}
): string {
  const inputMap = new Map(inputs.map((input) => [input.id, input]))

  return template.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, inputId: string) => {
    const input = inputMap.get(inputId)
    if (!input) return match
    return normalizeInputValue(input, values[inputId])
  })
}

export function getMissingRequiredWorkflowInputs(
  inputs: WorkflowInputDefinition[],
  values: WorkflowInputValues = {}
): WorkflowInputDefinition[] {
  return inputs.filter((input) => {
    if (!input.required) return false

    const value = values[input.id]
    if (input.type === 'boolean') {
      return value === undefined
    }

    if (value === undefined || value === null) {
      return true
    }

    return String(value).trim().length === 0
  })
}

function buildCompoundCommand(steps: WorkflowExecutionStep[]): string {
  return steps
    .map((step, index) =>
      index < steps.length - 1
        ? `${step.commandString}${step.continueOnError ? ' ;' : ' &&'}`
        : step.commandString
    )
    .join(' ')
}

export function buildWorkflowExecutionPlan(
  workflow: WorkflowDefinition,
  options: BuildExecutionPlanOptions = {}
): WorkflowExecutionPlan {
  const { fromIndex = 0, singleOnly = false, inputValues = {} } = options
  const slice = singleOnly
    ? workflow.steps.slice(fromIndex, fromIndex + 1)
    : workflow.steps.slice(fromIndex)

  const steps = slice
    .map((step, offset) => ({ step, sourceIndex: fromIndex + offset }))
    .filter(
      (
        entry
      ): entry is {
        step: WorkflowCommandStepDefinition
        sourceIndex: number
      } => entry.step.type === 'command' && entry.step.enabled
    )
    .map(({ step, sourceIndex }) => ({
      ...step,
      label: resolveWorkflowTemplate(step.label, workflow.inputs, inputValues),
      commandString: resolveWorkflowTemplate(step.commandString, workflow.inputs, inputValues),
      sourceIndex
    }))

  return {
    steps,
    compoundCommand: buildCompoundCommand(steps)
  }
}

export function buildWorkflowPreparationSteps(
  workflow: WorkflowDefinition,
  options: BuildExecutionPlanOptions = {}
): WorkflowPreparationStep[] {
  const { fromIndex = 0, singleOnly = false, inputValues = {} } = options
  const slice = singleOnly
    ? workflow.steps.slice(fromIndex, fromIndex + 1)
    : workflow.steps.slice(fromIndex)

  return slice
    .map((step, offset) => ({ step, sourceIndex: fromIndex + offset }))
    .filter(
      (
        entry
      ): entry is {
        step: WorkflowApprovalStepDefinition | WorkflowNoteStepDefinition
        sourceIndex: number
      } => (entry.step.type === 'approval' || entry.step.type === 'note') && entry.step.enabled
    )
    .map(({ step, sourceIndex }) =>
      step.type === 'approval'
        ? {
            ...step,
            label: resolveWorkflowTemplate(step.label, workflow.inputs, inputValues),
            message: resolveWorkflowTemplate(step.message, workflow.inputs, inputValues),
            sourceIndex
          }
        : {
            ...step,
            label: resolveWorkflowTemplate(step.label, workflow.inputs, inputValues),
            content: resolveWorkflowTemplate(step.content, workflow.inputs, inputValues),
            sourceIndex
          }
    )
}

export function buildScriptRunSteps(
  script: Script,
  options: BuildExecutionPlanOptions = {}
): ScriptRunStep[] {
  const { fromIndex = 0, singleOnly = false, inputValues = {} } = options
  const slice = singleOnly
    ? script.steps.slice(fromIndex, fromIndex + 1)
    : script.steps.slice(fromIndex)

  return slice
    .map((step, offset) => ({ step, sourceIndex: fromIndex + offset }))
    .filter((entry) => entry.step.enabled)
    .map(({ step, sourceIndex }) =>
      step.type === 'command'
        ? {
            ...step,
            label: resolveWorkflowTemplate(step.label, script.inputs, inputValues),
            commandString: resolveWorkflowTemplate(step.commandString, script.inputs, inputValues),
            sourceIndex
          }
        : step.type === 'approval'
          ? {
              ...step,
              label: resolveWorkflowTemplate(step.label, script.inputs, inputValues),
              message: resolveWorkflowTemplate(step.message, script.inputs, inputValues),
              sourceIndex
            }
          : {
              ...step,
              label: resolveWorkflowTemplate(step.label, script.inputs, inputValues),
              content: resolveWorkflowTemplate(step.content, script.inputs, inputValues),
              sourceIndex
            }
    )
}

export function buildScriptExecutionPlan(
  script: Script,
  options: BuildExecutionPlanOptions = {}
): WorkflowExecutionPlan {
  const steps = buildScriptRunSteps(script, options).filter(
    (step): step is ScriptCommandStep & { sourceIndex: number } => step.type === 'command'
  )

  return {
    steps,
    compoundCommand: buildCompoundCommand(steps)
  }
}

export function buildScriptPreparationSteps(
  script: Script,
  options: BuildExecutionPlanOptions = {}
): WorkflowPreparationStep[] {
  return buildScriptRunSteps(script, options).filter(
    (
      step
    ): step is
      | (ScriptApprovalStep & { sourceIndex: number })
      | (ScriptNoteStep & { sourceIndex: number }) => step.type === 'approval' || step.type === 'note'
  )
}

export function getScriptUnknownInputReferences(
  script: Script,
  options: BuildExecutionPlanOptions = {}
): string[] {
  const { fromIndex = 0, singleOnly = false } = options
  const slice = singleOnly
    ? script.steps.slice(fromIndex, fromIndex + 1)
    : script.steps.slice(fromIndex)

  return getUnknownWorkflowPlaceholders(
    script.inputs,
    slice.filter((step) => step.enabled)
  )
}
