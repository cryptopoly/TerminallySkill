import { useState } from 'react'
import { Info, Loader2, Plus, Settings2, Sparkles, Trash2, Wand2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { normalizeWorkflowInputDefinitions, normalizeWorkflowInputId } from '../../../../shared/workflow-validation'
import type { WorkflowInputDefinition } from '../../../../shared/workflow-schema'
import { HelpTip } from '../ui/HelpTip'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useSettingsStore } from '../../store/settings-store'

interface WorkflowInputEditorProps {
  inputs: WorkflowInputDefinition[]
  steps: { label: string; commandString?: string }[]
  onChange: (inputs: WorkflowInputDefinition[], renamedInputs?: Record<string, string>) => void
}

function createDefaultInput(index: number): WorkflowInputDefinition {
  return {
    id: '',
    label: '',
    description: '',
    type: 'string',
    required: false,
    defaultValue: '',
    placeholder: ''
  }
}

function normalizeInputType(input: WorkflowInputDefinition, nextType: WorkflowInputDefinition['type']): WorkflowInputDefinition {
  if (nextType === input.type) return input

  if (nextType === 'number') {
    return {
      id: input.id,
      label: input.label,
      description: input.description,
      type: 'number',
      required: input.required,
      defaultValue: typeof input.defaultValue === 'number' ? input.defaultValue : undefined
    }
  }

  if (nextType === 'boolean') {
    return {
      id: input.id,
      label: input.label,
      description: input.description,
      type: 'boolean',
      required: input.required,
      defaultValue: typeof input.defaultValue === 'boolean' ? input.defaultValue : false
    }
  }

  if (nextType === 'choice') {
    return {
      id: input.id,
      label: input.label,
      description: input.description,
      type: 'choice',
      required: input.required,
      defaultValue: typeof input.defaultValue === 'string' ? input.defaultValue : '',
      options: [],
      allowCustomValue: false
    }
  }

  return {
    id: input.id,
    label: input.label,
    description: input.description,
    type: 'string',
    required: input.required,
    defaultValue: typeof input.defaultValue === 'string' ? input.defaultValue : '',
    placeholder: ''
  }
}

export function WorkflowInputEditor({
  inputs,
  steps,
  onChange
}: WorkflowInputEditorProps): JSX.Element {
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null)
  const [showAIDraft, setShowAIDraft] = useState(false)
  const [aiDraftPrompt, setAIDraftPrompt] = useState('')
  const [aiDraftLoading, setAIDraftLoading] = useState(false)
  const [aiDraftResult, setAIDraftResult] = useState<string | null>(null)
  const [aiDraftError, setAIDraftError] = useState<string | null>(null)
  const [aiDraftMeta, setAIDraftMeta] = useState<{ providerLabel: string; model: string } | null>(null)
  const activeAIProvider = useSettingsStore((s) => s.settings.activeAIProvider)

  const emitInputs = (
    nextInputs: WorkflowInputDefinition[],
    shouldTrackRenames = false
  ): void => {
    const normalizedInputs = normalizeWorkflowInputDefinitions(nextInputs)

    if (!shouldTrackRenames || normalizedInputs.length !== inputs.length) {
      onChange(normalizedInputs)
      return
    }

    const renamedInputs = Object.fromEntries(
      inputs.flatMap((input, index) => {
        const nextInput = normalizedInputs[index]
        if (!nextInput || nextInput.id === input.id) return []
        return [[input.id, nextInput.id]]
      })
    )

    onChange(
      normalizedInputs,
      Object.keys(renamedInputs).length > 0 ? renamedInputs : undefined
    )
  }

  const updateInput = (index: number, nextInput: WorkflowInputDefinition): void => {
    emitInputs(inputs.map((input, inputIndex) => (inputIndex === index ? nextInput : input)), true)
  }

  const removeInput = (index: number): void => {
    emitInputs(inputs.filter((_, inputIndex) => inputIndex !== index))
    setConfirmDeleteIndex(null)
  }

  const handleAIDraft = async (): Promise<void> => {
    if (!activeAIProvider) return
    if (!aiDraftPrompt.trim()) {
      setAIDraftError('Describe what this workflow does so AI can suggest inputs.')
      return
    }

    setAIDraftLoading(true)
    setAIDraftError(null)
    setAIDraftResult(null)
    setAIDraftMeta(null)

    const stepsDescription = steps.length > 0
      ? steps.map((s, i) => `Step ${i + 1}: ${s.label}${s.commandString ? ` — ${s.commandString}` : ''}`).join('\n')
      : 'No steps defined yet.'

    const existingInputs = inputs.length > 0
      ? inputs.map((inp) => `- {{${inp.id}}} (${inp.type}${inp.required ? ', required' : ''}): ${inp.description || inp.label}`).join('\n')
      : 'None.'

    try {
      const response = await window.electronAPI.runAIAction({
        action: 'command-review',
        commandName: 'Workflow Input Draft',
        commandString: `User description: ${aiDraftPrompt}\n\nWorkflow Steps:\n${stepsDescription}\n\nExisting Inputs:\n${existingInputs}`,
        commandDescription: 'Based on the user\'s description and the workflow steps above, suggest workflow inputs that would make this script reusable. For each input suggest: a label, placeholder key (snake_case), type (string/number/boolean/choice), whether it should be required, a sensible default value, and a brief description. Also point out any hardcoded values in the steps that could be parameterised with {{placeholder}} syntax. Format as a clear list. Be concise and practical.'
      })
      setAIDraftResult(response.text)
      if (response.providerLabel && response.model) {
        setAIDraftMeta({ providerLabel: response.providerLabel, model: response.model })
      }
    } catch {
      setAIDraftError('Could not reach AI provider. Check your AI settings.')
    } finally {
      setAIDraftLoading(false)
    }
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Settings2 size={14} className="text-accent-light shrink-0" />
        <h3 className="text-sm font-semibold text-gray-200">Workflow Inputs</h3>
        <HelpTip
          label="Workflow Inputs"
          description={`Define variables that get filled in each time you run this script. Reference them in command steps using {{placeholder_key}} syntax.\n\nExample: A deploy script could have inputs for environment (staging/prod), version number, and whether to run migrations — making the same script reusable across contexts.\n\nTypes: Text, Number, Boolean (checkbox), or Choice (dropdown). Mark inputs as Required to prevent running without a value.`}
        >
          <span className="text-gray-500 hover:text-gray-300 cursor-help transition-colors"><Info size={13} /></span>
        </HelpTip>
        <div className="flex items-center gap-1 ml-auto">
          {activeAIProvider && (
            <button
              onClick={() => setShowAIDraft(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-accent-light transition-colors"
              title="Get AI suggestions for workflow inputs based on your steps"
            >
              <Wand2 size={12} />
              AI Draft
            </button>
          )}
          <button
            onClick={() => onChange([...inputs, createDefaultInput(inputs.length)])}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-surface-border text-xs text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors"
          >
            <Plus size={12} />
            Add Input
          </button>
        </div>
      </div>

      {inputs.length > 0 && (
        <div className="space-y-2">
          {inputs.map((input, index) => (
            <div key={`${input.id}-${index}`} className="rounded-lg border border-surface-border bg-surface px-3 py-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 flex-1 min-w-0 items-center">
                  <input
                    type="text"
                    value={input.label}
                    onChange={(e) =>
                      updateInput(index, {
                        ...input,
                        label: e.target.value,
                        id:
                          input.id === normalizeWorkflowInputId(input.label, index) || input.id === `input_${index + 1}` || input.id === ''
                            ? normalizeWorkflowInputId(e.target.value, index)
                            : input.id
                      })
                    }
                    placeholder="Label"
                    title="Display name shown to the user when running this workflow"
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent min-w-0"
                  />
                  <input
                    type="text"
                    value={input.id}
                    onChange={(e) =>
                      updateInput(index, {
                        ...input,
                        id: normalizeWorkflowInputId(e.target.value, index)
                      })
                    }
                    placeholder="placeholder_key"
                    title="Use {{this_key}} in command steps to insert the value at run time"
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:border-accent min-w-0"
                  />
                  <select
                    value={input.type}
                    onChange={(e) =>
                      updateInput(index, normalizeInputType(input, e.target.value as WorkflowInputDefinition['type']))
                    }
                    title="Data type — Text (free text), Number (numeric with optional min/max), Boolean (true/false checkbox), Choice (dropdown list)"
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                  >
                    <option value="string">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="choice">Choice</option>
                  </select>
                  <div className="flex items-center gap-1">
                    <label
                      className="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer"
                      title="When checked, this input must be filled in before the workflow can run"
                    >
                      <input
                        type="checkbox"
                        checked={input.required}
                        onChange={(e) => updateInput(index, { ...input, required: e.target.checked })}
                        className="rounded border-surface-border bg-surface w-3 h-3"
                      />
                      Req
                    </label>
                    <button
                      onClick={() => setConfirmDeleteIndex(index)}
                      className="p-1 text-gray-500 hover:text-destructive transition-colors"
                      title="Remove this input from the workflow"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>

              {input.type === 'string' && (
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={input.description}
                    onChange={(e) => updateInput(index, { ...input, description: e.target.value })}
                    placeholder="Description"
                    title="Help text shown below the input field when running the workflow"
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                  />
                  <input
                    type="text"
                    value={input.defaultValue ?? ''}
                    onChange={(e) => updateInput(index, { ...input, defaultValue: e.target.value })}
                    placeholder="Default"
                    title="Pre-filled value — the user can change it before running"
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                  />
                  <input
                    type="text"
                    value={input.placeholder}
                    onChange={(e) => updateInput(index, { ...input, placeholder: e.target.value })}
                    placeholder="Placeholder text"
                    title="Greyed-out hint shown inside the input when it is empty"
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                  />
                </div>
              )}

              {input.type === 'number' && (
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="number"
                    value={input.defaultValue ?? ''}
                    onChange={(e) =>
                      updateInput(index, {
                        ...input,
                        defaultValue: e.target.value === '' ? undefined : Number(e.target.value)
                      })
                    }
                    placeholder="Default"
                    title="Pre-filled numeric value"
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                  />
                  <input
                    type="number"
                    value={input.min ?? ''}
                    onChange={(e) =>
                      updateInput(index, {
                        ...input,
                        min: e.target.value === '' ? undefined : Number(e.target.value)
                      })
                    }
                    placeholder="Min"
                    title="Minimum allowed value (optional)"
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                  />
                  <input
                    type="number"
                    value={input.max ?? ''}
                    onChange={(e) =>
                      updateInput(index, {
                        ...input,
                        max: e.target.value === '' ? undefined : Number(e.target.value)
                      })
                    }
                    placeholder="Max"
                    title="Maximum allowed value (optional)"
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                  />
                  <input
                    type="number"
                    value={input.step ?? ''}
                    onChange={(e) =>
                      updateInput(index, {
                        ...input,
                        step: e.target.value === '' ? undefined : Number(e.target.value)
                      })
                    }
                    placeholder="Step"
                    title="Increment step for the number input (e.g. 0.1 for decimals)"
                    className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                  />
                </div>
              )}

              {input.type === 'boolean' && (
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer" title="Whether this boolean defaults to checked (true) or unchecked (false)">
                  <input
                    type="checkbox"
                    checked={Boolean(input.defaultValue)}
                    onChange={(e) => updateInput(index, { ...input, defaultValue: e.target.checked })}
                    className="rounded border-surface-border bg-surface"
                  />
                  Default to true
                </label>
              )}

              {input.type === 'choice' && (
                <div className="space-y-2">
                  <textarea
                    value={input.options.map((option) => `${option.label}=${option.value}`).join('\n')}
                    onChange={(e) =>
                      updateInput(index, {
                        ...input,
                        options: e.target.value
                          .split('\n')
                          .map((line) => line.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const [label, value] = line.includes('=')
                              ? line.split('=').map((part) => part.trim())
                              : [line, line]
                            return { label, value }
                          })
                      })
                    }
                    rows={3}
                    placeholder="Options (one per line, label=value optional)"
                    title="Each line becomes a dropdown option. Use label=value to show a friendly label while passing a different value"
                    className="w-full bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={input.defaultValue ?? ''}
                      onChange={(e) => updateInput(index, { ...input, defaultValue: e.target.value })}
                      placeholder="Default option"
                      title="Which option is pre-selected (must match a value from the list above)"
                      className="bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent"
                    />
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer" title="Allow the user to type a custom value not in the dropdown list">
                      <input
                        type="checkbox"
                        checked={input.allowCustomValue}
                        onChange={(e) => updateInput(index, { ...input, allowCustomValue: e.target.checked })}
                        className="rounded border-surface-border bg-surface"
                      />
                      Allow custom values
                    </label>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {confirmDeleteIndex !== null && (
        <ConfirmDialog
          title="Remove Input"
          message={`"${inputs[confirmDeleteIndex]?.label || inputs[confirmDeleteIndex]?.id || 'this input'}" will be removed. Any {{${inputs[confirmDeleteIndex]?.id ?? ''}}} placeholders in steps will no longer be substituted.`}
          confirmLabel="Remove"
          onConfirm={() => removeInput(confirmDeleteIndex)}
          onCancel={() => setConfirmDeleteIndex(null)}
        />
      )}

      {showAIDraft && createPortal(
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-start justify-center overflow-y-auto p-6">
          <div className="mt-8 mb-8 w-full max-w-3xl rounded-2xl border border-surface-border bg-surface-light shadow-2xl shadow-black/50 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-surface-border">
              <div>
                <h3 className="text-lg font-semibold text-gray-200">AI Input Draft</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Describe your workflow and AI will suggest inputs to make it reusable.
                </p>
              </div>
              <button
                onClick={() => {
                  if (aiDraftLoading) return
                  setShowAIDraft(false)
                }}
                className="p-1 rounded-lg hover:bg-surface text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200">What does this workflow do?</label>
                <textarea
                  value={aiDraftPrompt}
                  onChange={(e) => setAIDraftPrompt(e.target.value)}
                  rows={3}
                  placeholder="Example: Deploy a service to a chosen environment with optional database migration and rollback support."
                  className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      void handleAIDraft()
                    }
                  }}
                />
                <button
                  onClick={() => void handleAIDraft()}
                  disabled={aiDraftLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {aiDraftLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Wand2 size={14} />
                  )}
                  {aiDraftLoading ? 'Generating...' : 'Generate Suggestions'}
                </button>
              </div>

              {aiDraftError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {aiDraftError}
                </div>
              )}

              {aiDraftResult && (
                <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-accent-light" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      AI Suggestions
                    </span>
                    {aiDraftMeta && (
                      <span className="text-[11px] text-gray-500 ml-auto">
                        {aiDraftMeta.providerLabel} · {aiDraftMeta.model}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-200 whitespace-pre-wrap leading-6">
                    {aiDraftResult}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}
