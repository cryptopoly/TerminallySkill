import { useBuilderStore } from '../../store/builder-store'
import { evaluateCondition } from '../../lib/condition-evaluator'
import { BooleanFlag } from './fields/BooleanFlag'
import { StringInput } from './fields/StringInput'
import { NumberInput } from './fields/NumberInput'
import { EnumSelect } from './fields/EnumSelect'
import { FilePathInput } from './fields/FilePathInput'
import { MultiSelect } from './fields/MultiSelect'
import { RepeatableInput } from './fields/RepeatableInput'
import type { CommandOption, ExclusiveGroup } from '../../../../shared/command-schema'

interface OptionRendererProps {
  option: CommandOption
  values: Record<string, unknown>
  exclusiveGroups?: ExclusiveGroup[]
}

export function OptionRenderer({
  option,
  values,
  exclusiveGroups
}: OptionRendererProps): JSX.Element | null {
  const setValue = useBuilderStore((s) => s.setValue)

  const visible = evaluateCondition(option.showWhen, values)
  if (!visible) return null

  const value = values[option.id] ?? option.defaultValue ?? getDefaultForType(option.type)

  const handleChange = (newValue: unknown): void => {
    // Handle exclusive groups - clear others when setting one
    if (exclusiveGroups) {
      for (const group of exclusiveGroups) {
        if (group.optionIds.includes(option.id)) {
          for (const otherId of group.optionIds) {
            if (otherId !== option.id) {
              setValue(otherId, false)
            }
          }
        }
      }
    }
    setValue(option.id, newValue)
  }

  switch (option.type) {
    case 'boolean':
      return (
        <BooleanFlag
          option={option}
          value={value as boolean}
          onChange={handleChange}
        />
      )
    case 'string':
      return (
        <StringInput
          option={option}
          value={value as string}
          onChange={handleChange}
        />
      )
    case 'number':
      return (
        <NumberInput
          option={option}
          value={value as number}
          onChange={handleChange}
        />
      )
    case 'enum':
      if (!option.choices || option.choices.length === 0) {
        return option.separator ? (
          <StringInput
            option={{ ...option, type: 'string' }}
            value={String(value ?? '')}
            onChange={handleChange}
          />
        ) : (
          <BooleanFlag
            option={{ ...option, type: 'boolean' }}
            value={Boolean(value)}
            onChange={handleChange}
          />
        )
      }
      return (
        <EnumSelect
          option={option}
          value={value as string}
          onChange={handleChange}
        />
      )
    case 'file-path':
    case 'directory-path':
      return (
        <FilePathInput
          option={option}
          value={value as string}
          onChange={handleChange}
        />
      )
    case 'multi-select':
      if (!option.choices || option.choices.length === 0) {
        return (
          <RepeatableInput
            option={{ ...option, type: 'repeatable' }}
            value={Array.isArray(value) ? (value as string[]) : []}
            onChange={handleChange}
          />
        )
      }
      return (
        <MultiSelect
          option={option}
          value={value as string[]}
          onChange={handleChange}
        />
      )
    case 'repeatable':
      return (
        <RepeatableInput
          option={option}
          value={value as string[]}
          onChange={handleChange}
        />
      )
    default:
      return null
  }
}

function getDefaultForType(type: string): unknown {
  switch (type) {
    case 'boolean':
      return false
    case 'number':
      return 0
    case 'multi-select':
    case 'repeatable':
      return []
    default:
      return ''
  }
}
