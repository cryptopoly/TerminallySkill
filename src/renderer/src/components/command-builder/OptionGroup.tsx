import { OptionRenderer } from './OptionRenderer'
import type { CommandOption, ExclusiveGroup } from '../../../../shared/command-schema'

interface OptionGroupProps {
  label: string
  options: CommandOption[]
  values: Record<string, unknown>
  exclusiveGroups?: ExclusiveGroup[]
}

export function OptionGroup({
  label,
  options,
  values,
  exclusiveGroups
}: OptionGroupProps): JSX.Element {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
        {label}
      </h3>
      <div className="space-y-3">
        {options.map((option) => (
          <OptionRenderer
            key={option.id}
            option={option}
            values={values}
            exclusiveGroups={exclusiveGroups}
          />
        ))}
      </div>
    </div>
  )
}
