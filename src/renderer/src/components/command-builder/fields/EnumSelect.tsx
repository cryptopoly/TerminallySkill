import type { CommandOption } from '../../../../../shared/command-schema'
import { OptionInfoIcon } from '../../ui/OptionInfoIcon'

interface EnumSelectProps {
  option: CommandOption
  value: string
  onChange: (value: string) => void
}

export function EnumSelect({ option, value, onChange }: EnumSelectProps): JSX.Element {
  const flag = option.short || option.long || ''

  return (
    <div className="py-1">
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-sm text-gray-200">{option.label}</label>
        <code className="text-xs text-gray-500 font-mono">{flag}</code>
        <OptionInfoIcon option={option} />
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors cursor-pointer max-w-md"
      >
        {option.choices?.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
            {choice.description ? ` - ${choice.description}` : ''}
          </option>
        ))}
      </select>
      {option.description && (
        <p className="text-xs text-gray-500 mt-1">{option.description}</p>
      )}
    </div>
  )
}
