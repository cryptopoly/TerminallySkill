import type { CommandOption } from '../../../../../shared/command-schema'
import { OptionInfoIcon } from '../../ui/OptionInfoIcon'

interface BooleanFlagProps {
  option: CommandOption
  value: boolean
  onChange: (value: boolean) => void
}

export function BooleanFlag({ option, value, onChange }: BooleanFlagProps): JSX.Element {
  const flag = option.short || option.long || ''

  return (
    <label className="flex items-start gap-3 cursor-pointer group py-1">
      <div className="pt-0.5">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded bg-surface border-surface-border text-accent focus:ring-accent focus:ring-offset-0 focus:ring-1 cursor-pointer"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-200 group-hover:text-gray-200 transition-colors">
            {option.label}
          </span>
          <code className="text-xs text-gray-500 font-mono">{flag}</code>
          <OptionInfoIcon option={option} />
        </div>
        {option.description && (
          <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
        )}
      </div>
    </label>
  )
}
