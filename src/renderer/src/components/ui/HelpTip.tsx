import type { ReactNode } from 'react'
import { Tooltip } from './Tooltip'
import { useSettingsStore } from '../../store/settings-store'

interface HelpTipProps {
  /** Short bold title */
  label: string
  /** Longer explanation shown below the label */
  description?: string
  /** Keyboard shortcut badge, e.g. "⌘D" */
  shortcut?: string
  /** When true, suppresses both rich and native-title tooltip rendering */
  disabled?: boolean
  children: ReactNode
}

/**
 * Toggleable help tooltip wrapper.
 * When `showHelpTooltips` is on in settings → renders a rich styled Tooltip.
 * When off → renders children with a plain native `title` attribute as fallback.
 */
export function HelpTip({ label, description, shortcut, disabled = false, children }: HelpTipProps): JSX.Element {
  const showHelp = useSettingsStore((s) => s.settings.showHelpTooltips)

  if (disabled) {
    return <span className="inline-flex">{children}</span>
  }

  if (!showHelp) {
    return (
      <span className="inline-flex" title={label}>
        {children}
      </span>
    )
  }

  return (
    <Tooltip
      content={
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-200">{label}</span>
            {shortcut && (
              <kbd className="px-1.5 py-0.5 rounded bg-surface border border-surface-border text-[10px] font-mono text-gray-400">
                {shortcut}
              </kbd>
            )}
          </div>
          {description && (
            <p className="text-gray-400 leading-relaxed">{description}</p>
          )}
        </div>
      }
    >
      {children}
    </Tooltip>
  )
}
