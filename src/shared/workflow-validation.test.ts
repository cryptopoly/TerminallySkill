import { describe, expect, it } from 'vitest'
import type { ScriptStep } from './script-schema'
import type { WorkflowInputDefinition } from './workflow-schema'
import {
  extractWorkflowTemplateReferences,
  getUnknownWorkflowPlaceholders,
  getWorkflowInputInitialValue,
  getWorkflowInputValidationIssues,
  normalizeWorkflowInputDefinitions,
  renameWorkflowStepPlaceholders
} from './workflow-validation'

describe('workflow-validation', () => {
  it('normalizes workflow inputs into unique, runnable definitions', () => {
    const normalized = normalizeWorkflowInputDefinitions([
      {
        id: 'Deploy Env',
        label: 'Deploy Env',
        description: '',
        type: 'string',
        required: false,
        defaultValue: 'production',
        placeholder: ''
      },
      {
        id: 'deploy_env',
        label: 'Deploy Env Copy',
        description: '',
        type: 'choice',
        required: true,
        defaultValue: 'missing',
        options: [
          { label: 'Stable', value: 'stable' },
          { label: 'Stable duplicate', value: 'stable' },
          { label: 'Beta', value: 'beta' }
        ],
        allowCustomValue: false
      },
      {
        id: '',
        label: 'Retries',
        description: '',
        type: 'number',
        required: false,
        defaultValue: 15,
        min: 10,
        max: 2,
        step: 0
      }
    ])

    expect(normalized.map((input) => input.id)).toEqual([
      'deploy_env',
      'deploy_env_2',
      'retries'
    ])
    expect(normalized[1]).toMatchObject({
      type: 'choice',
      options: [
        { label: 'Stable', value: 'stable' },
        { label: 'Beta', value: 'beta' }
      ],
      defaultValue: 'stable'
    })
    expect(normalized[2]).toMatchObject({
      type: 'number',
      min: 2,
      max: 10,
      defaultValue: undefined,
      step: undefined
    })
  })

  it('derives safe initial values and validates runtime input values', () => {
    const inputs: WorkflowInputDefinition[] = [
      {
        id: 'channel',
        label: 'Channel',
        description: '',
        type: 'choice',
        required: true,
        defaultValue: undefined,
        options: [
          { label: 'Stable', value: 'stable' },
          { label: 'Beta', value: 'beta' }
        ],
        allowCustomValue: false
      },
      {
        id: 'retries',
        label: 'Retries',
        description: '',
        type: 'number',
        required: false,
        defaultValue: 2,
        min: 0,
        max: 10,
        step: 2
      }
    ]

    expect(getWorkflowInputInitialValue(inputs[0])).toBe('stable')

    expect(
      getWorkflowInputValidationIssues(inputs, {
        channel: 'nightly',
        retries: 3
      })
    ).toEqual([
      {
        inputId: 'channel',
        label: 'Channel',
        message: 'Choose one of the configured options.'
      },
      {
        inputId: 'retries',
        label: 'Retries',
        message: 'Value must follow step increments of 2.'
      }
    ])
  })

  it('tracks unknown placeholders and rewrites step templates when input ids change', () => {
    const steps: ScriptStep[] = [
      {
        id: 'step-1',
        type: 'command',
        label: 'Deploy {{target}}',
        enabled: true,
        commandString: 'deploy --env {{target}} --region {{region}}',
        commandId: null,
        continueOnError: false,
        delayMs: 0,
        retryCount: 0
      },
      {
        id: 'step-2',
        type: 'approval',
        label: 'Confirm {{target}}',
        enabled: true,
        message: 'Ship to {{target}}?',
        requireConfirmation: true
      }
    ]

    expect(extractWorkflowTemplateReferences('deploy {{target}} {{ target }}')).toEqual(['target'])
    expect(
      getUnknownWorkflowPlaceholders(
        [
          {
            id: 'target',
            label: 'Target',
            description: '',
            type: 'string',
            required: true,
            defaultValue: '',
            placeholder: ''
          }
        ],
        steps
      )
    ).toEqual(['region'])

    expect(
      renameWorkflowStepPlaceholders(steps, {
        target: 'environment'
      })
    ).toMatchObject([
      {
        label: 'Deploy {{environment}}',
        commandString: 'deploy --env {{environment}} --region {{region}}'
      },
      {
        label: 'Confirm {{environment}}',
        message: 'Ship to {{environment}}?'
      }
    ])
  })
})
