import type { CommandOption } from '../../../../../shared/command-schema'
import { OptionInfoIcon } from '../../ui/OptionInfoIcon'

interface MultiSelectProps {
  option: CommandOption
  value: string[]
  onChange: (value: string[]) => void
}

export function MultiSelect({ option, value, onChange }: MultiSelectProps): JSX.Element {
  const flag = option.short || option.long || ''

  const toggle = (choiceValue: string): void => {
    if (value.includes(choiceValue)) {
      onChange(value.filter((v) => v !== choiceValue))
    } else {
      onChange([...value, choiceValue])
    }
  }

  return (
    <div className="py-1">
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-sm text-gray-200">{option.label}</label>
        <code className="text-xs text-gray-500 font-mono">{flag}</code>
        <OptionInfoIcon option={option} />
      </div>
      <div className="space-y-1.5">
        {option.choices?.map((choice) => (
          <label key={choice.value} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={value.includes(choice.value)}
              onChange={() => toggle(choice.value)}
              className="w-4 h-4 rounded bg-surface border-surface-border text-accent focus:ring-accent focus:ring-offset-0 focus:ring-1 cursor-pointer"
            />
            <span className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors">
              {choice.label}
            </span>
            {choice.description && (
              <span className="text-xs text-gray-500">({choice.description})</span>
            )}
          </label>
        ))}
      </div>
    </div>
  )
}
