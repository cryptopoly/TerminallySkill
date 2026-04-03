import { useState } from 'react'
import clsx from 'clsx'
import type { CommandOption } from '../../../../../shared/command-schema'
import { OptionInfoIcon } from '../../ui/OptionInfoIcon'

interface StringInputProps {
  option: CommandOption
  value: string
  onChange: (value: string) => void
}

export function StringInput({ option, value, onChange }: StringInputProps): JSX.Element {
  const [error, setError] = useState<string | null>(null)
  const flag = option.short || option.long || ''

  const validate = (val: string): void => {
    if (!option.validation) {
      setError(null)
      return
    }
    const v = option.validation
    if (v.minLength && val.length < v.minLength && val.length > 0) {
      setError(v.message || `Minimum ${v.minLength} characters`)
      return
    }
    if (v.maxLength && val.length > v.maxLength) {
      setError(v.message || `Maximum ${v.maxLength} characters`)
      return
    }
    if (v.pattern && val && !new RegExp(v.pattern).test(val)) {
      setError(v.message || 'Invalid format')
      return
    }
    setError(null)
  }

  return (
    <div className="py-1">
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-sm text-gray-200">{option.label}</label>
        <code className="text-xs text-gray-500 font-mono">{flag}</code>
        <OptionInfoIcon option={option} />
        {option.required && <span className="text-xs text-accent">required</span>}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          validate(e.target.value)
        }}
        placeholder={option.description}
        className={clsx(
          'w-full max-w-md bg-surface border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors',
          error
            ? 'border-destructive focus:border-destructive focus:ring-destructive'
            : 'border-surface-border focus:border-accent focus:ring-accent'
        )}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      {!error && option.description && (
        <p className="text-xs text-gray-500 mt-1">{option.description}</p>
      )}
    </div>
  )
}
