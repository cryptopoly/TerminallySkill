import type { ScriptStep } from './script-schema'
import type { WorkflowInputDefinition, WorkflowStepDefinition } from './workflow-schema'

export interface WorkflowInputValidationIssue {
  inputId: string
  label: string
  message: string
}

type WorkflowInputRuntimeValue = string | number | boolean | undefined
type WorkflowInputRuntimeValues = Record<string, WorkflowInputRuntimeValue>
type WorkflowTemplatedStep = ScriptStep | WorkflowStepDefinition

const WORKFLOW_PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function createFallbackInputLabel(index: number): string {
  return `Input ${index + 1}`
}

function ensureUniqueInputId(baseId: string, seenIds: Set<string>): string {
  if (!seenIds.has(baseId)) {
    seenIds.add(baseId)
    return baseId
  }

  let suffix = 2
  let candidate = `${baseId}_${suffix}`
  while (seenIds.has(candidate)) {
    suffix += 1
    candidate = `${baseId}_${suffix}`
  }
  seenIds.add(candidate)
  return candidate
}

function normalizeChoiceOptions(
  options: Array<{ label: string; value: string }>
): Array<{ label: string; value: string }> {
  const seenValues = new Set<string>()

  return options.flatMap((option) => {
    const label = option.label.trim()
    const value = option.value.trim()
    if (!label || !value || seenValues.has(value)) return []
    seenValues.add(value)
    return [{ label, value }]
  })
}

function getStepTemplates(step: WorkflowTemplatedStep): string[] {
  if (step.type === 'approval') {
    return [step.label, step.message]
  }

  if (step.type === 'note') {
    return [step.label, step.content]
  }

  return [step.label, step.commandString]
}

function isStepAlignedToIncrement(value: number, min: number | undefined, step: number): boolean {
  const base = min ?? 0
  const distance = (value - base) / step
  return Math.abs(distance - Math.round(distance)) < 1e-9
}

export function normalizeWorkflowInputId(label: string, fallbackIndex: number): string {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return slug || `input_${fallbackIndex + 1}`
}

export function getWorkflowInputInitialValue(
  input: WorkflowInputDefinition
): WorkflowInputRuntimeValue {
  if (input.type === 'boolean') {
    return typeof input.defaultValue === 'boolean' ? input.defaultValue : false
  }

  if (input.type === 'number') {
    return isFiniteNumber(input.defaultValue) ? input.defaultValue : undefined
  }

  if (input.type === 'choice') {
    if (
      typeof input.defaultValue === 'string' &&
      (input.allowCustomValue || input.options.some((option) => option.value === input.defaultValue))
    ) {
      return input.defaultValue
    }

    if (input.required && !input.allowCustomValue && input.options.length > 0) {
      return input.options[0].value
    }

    return undefined
  }

  return typeof input.defaultValue === 'string' ? input.defaultValue : undefined
}

export function normalizeWorkflowInputDefinitions(
  inputs: WorkflowInputDefinition[]
): WorkflowInputDefinition[] {
  const seenIds = new Set<string>()

  return inputs.map((input, index) => {
    const label = input.label.trim() || createFallbackInputLabel(index)
    const id = ensureUniqueInputId(
      normalizeWorkflowInputId(input.id || label, index),
      seenIds
    )
    const description = input.description ?? ''
    const required = Boolean(input.required)

    if (input.type === 'number') {
      const rawMin = isFiniteNumber(input.min) ? input.min : undefined
      const rawMax = isFiniteNumber(input.max) ? input.max : undefined
      const min = rawMin !== undefined && rawMax !== undefined ? Math.min(rawMin, rawMax) : rawMin
      const max = rawMin !== undefined && rawMax !== undefined ? Math.max(rawMin, rawMax) : rawMax
      const step = isFiniteNumber(input.step) && input.step > 0 ? input.step : undefined
      const defaultValue =
        isFiniteNumber(input.defaultValue) &&
        (min === undefined || input.defaultValue >= min) &&
        (max === undefined || input.defaultValue <= max)
          ? input.defaultValue
          : undefined

      return {
        id,
        label,
        description,
        type: 'number',
        required,
        defaultValue,
        min,
        max,
        step
      }
    }

    if (input.type === 'boolean') {
      return {
        id,
        label,
        description,
        type: 'boolean',
        required,
        defaultValue: typeof input.defaultValue === 'boolean' ? input.defaultValue : false
      }
    }

    if (input.type === 'choice') {
      const options = normalizeChoiceOptions(input.options)
      const allowCustomValue = Boolean(input.allowCustomValue)
      const rawDefaultValue = typeof input.defaultValue === 'string' ? input.defaultValue : undefined
      const defaultValue =
        rawDefaultValue &&
        (allowCustomValue || options.some((option) => option.value === rawDefaultValue))
          ? rawDefaultValue
          : required && !allowCustomValue && options.length > 0
            ? options[0].value
            : undefined

      return {
        id,
        label,
        description,
        type: 'choice',
        required,
        defaultValue,
        options,
        allowCustomValue
      }
    }

    return {
      id,
      label,
      description,
      type: 'string',
      required,
      defaultValue: typeof input.defaultValue === 'string' ? input.defaultValue : '',
      placeholder: input.placeholder ?? ''
    }
  })
}

export function extractWorkflowTemplateReferences(template: string): string[] {
  const seen = new Set<string>()
  const references: string[] = []

  for (const match of template.matchAll(WORKFLOW_PLACEHOLDER_RE)) {
    const inputId = match[1]
    if (!seen.has(inputId)) {
      seen.add(inputId)
      references.push(inputId)
    }
  }

  return references
}

export function getUnknownWorkflowPlaceholders(
  inputs: WorkflowInputDefinition[],
  steps: WorkflowTemplatedStep[]
): string[] {
  const knownIds = new Set(inputs.map((input) => input.id))
  const missingIds = new Set<string>()

  for (const step of steps) {
    for (const template of getStepTemplates(step)) {
      for (const reference of extractWorkflowTemplateReferences(template)) {
        if (!knownIds.has(reference)) {
          missingIds.add(reference)
        }
      }
    }
  }

  return [...missingIds]
}

export function getWorkflowInputValidationIssues(
  inputs: WorkflowInputDefinition[],
  values: WorkflowInputRuntimeValues = {}
): WorkflowInputValidationIssue[] {
  return inputs.flatMap((input) => {
    const value = values[input.id]
    if (value === undefined) return []

    if (input.type === 'number') {
      if (!isFiniteNumber(value)) {
        return [{ inputId: input.id, label: input.label, message: 'Enter a valid number.' }]
      }

      if (input.min !== undefined && value < input.min) {
        return [
          {
            inputId: input.id,
            label: input.label,
            message: `Value must be at least ${input.min}.`
          }
        ]
      }

      if (input.max !== undefined && value > input.max) {
        return [
          {
            inputId: input.id,
            label: input.label,
            message: `Value must be at most ${input.max}.`
          }
        ]
      }

      if (input.step !== undefined && !isStepAlignedToIncrement(value, input.min, input.step)) {
        return [
          {
            inputId: input.id,
            label: input.label,
            message: `Value must follow step increments of ${input.step}.`
          }
        ]
      }

      return []
    }

    if (input.type === 'boolean') {
      return typeof value === 'boolean'
        ? []
        : [{ inputId: input.id, label: input.label, message: 'Choose true or false.' }]
    }

    if (input.type === 'choice') {
      if (typeof value !== 'string') {
        return [{ inputId: input.id, label: input.label, message: 'Choose a valid option.' }]
      }

      if (
        value.length > 0 &&
        !input.allowCustomValue &&
        !input.options.some((option) => option.value === value)
      ) {
        return [
          {
            inputId: input.id,
            label: input.label,
            message: 'Choose one of the configured options.'
          }
        ]
      }

      return []
    }

    return typeof value === 'string'
      ? []
      : [{ inputId: input.id, label: input.label, message: 'Enter text.' }]
  })
}

export function renameWorkflowTemplateReferences(
  template: string,
  renamedInputs: Record<string, string>
): string {
  return template.replace(WORKFLOW_PLACEHOLDER_RE, (match, inputId: string) => {
    const nextInputId = renamedInputs[inputId]
    return nextInputId ? `{{${nextInputId}}}` : match
  })
}

export function renameWorkflowStepPlaceholders<TStep extends WorkflowTemplatedStep>(
  steps: TStep[],
  renamedInputs: Record<string, string>
): TStep[] {
  if (Object.keys(renamedInputs).length === 0) return steps

  return steps.map((step) => {
    if (step.type === 'approval') {
      return {
        ...step,
        label: renameWorkflowTemplateReferences(step.label, renamedInputs),
        message: renameWorkflowTemplateReferences(step.message, renamedInputs)
      }
    }

    if (step.type === 'note') {
      return {
        ...step,
        label: renameWorkflowTemplateReferences(step.label, renamedInputs),
        content: renameWorkflowTemplateReferences(step.content, renamedInputs)
      }
    }

    return {
      ...step,
      label: renameWorkflowTemplateReferences(step.label, renamedInputs),
      commandString: renameWorkflowTemplateReferences(step.commandString, renamedInputs)
    }
  }) as TStep[]
}
