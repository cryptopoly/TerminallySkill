import { useState, useMemo } from 'react'
import { X, Check, Square, CheckSquare, Radar, Search } from 'lucide-react'
import type { DiscoveredCommand } from '../../../../shared/command-schema'

interface ScanResultsItem {
  executable: string
  path: string | null
  alreadyAdded: boolean
}

interface ScanResultsDialogProps {
  discovered: DiscoveredCommand[]
  existingExecutables?: string[]
  visibleExecutables?: string[]
  title?: string
  onSave: (selectedExecutables: string[]) => void
  onClose: () => void
}

export function ScanResultsDialog({
  discovered,
  existingExecutables = [],
  visibleExecutables = existingExecutables,
  title = 'Scan Results',
  onSave,
  onClose
}: ScanResultsDialogProps): JSX.Element {
  const [selected, setSelected] = useState<Set<string>>(new Set(visibleExecutables))
  const [filter, setFilter] = useState('')

  const items = useMemo<ScanResultsItem[]>(() => {
    const discoveredByExecutable = new Map(discovered.map((item) => [item.executable, item]))
    const existingSet = new Set(existingExecutables)

    const existingItems = existingExecutables
      .map<ScanResultsItem>((executable) => {
        const discoveredMatch = discoveredByExecutable.get(executable)
        return {
          executable,
          path: discoveredMatch?.path ?? null,
          alreadyAdded: true
        }
      })
      .sort((left, right) => left.executable.localeCompare(right.executable))

    const newItems = discovered
      .filter((item) => !existingSet.has(item.executable))
      .map<ScanResultsItem>((item) => ({
        executable: item.executable,
        path: item.path,
        alreadyAdded: false
      }))
      .sort((left, right) => left.executable.localeCompare(right.executable))

    return [...existingItems, ...newItems]
  }, [discovered, existingExecutables])

  const filtered = useMemo(() => {
    if (!filter.trim()) return items
    const q = filter.toLowerCase()
    return items.filter((item) => item.executable.toLowerCase().includes(q))
  }, [items, filter])

  const toggle = (executable: string): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(executable)) {
        next.delete(executable)
      } else {
        next.add(executable)
      }
      return next
    })
  }

  const selectAll = (): void => {
    setSelected(new Set(filtered.map((d) => d.executable)))
  }

  const deselectAll = (): void => {
    setSelected(new Set())
  }

  const handleSave = (): void => {
    onSave(Array.from(selected))
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
      <div className="bg-surface-light border border-surface-border rounded-2xl w-full max-w-lg shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Radar size={16} className="text-accent-light" />
            <h2 className="text-lg font-semibold text-gray-200">{title}</h2>
            <span className="text-xs text-gray-500 ml-2">
              {items.length} command trees
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-lighter text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter commands..."
              className="w-full bg-surface border border-surface-border rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-3 px-6 pt-3 pb-2">
          <button
            onClick={selectAll}
            className="text-xs text-accent-light hover:text-accent transition-colors"
          >
            Select All
          </button>
          <span className="text-gray-700">|</span>
          <button
            onClick={deselectAll}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Deselect All
          </button>
          <span className="ml-auto text-xs text-gray-600">
            {selected.size} selected
          </span>
        </div>

        {/* Command list */}
        <div className="px-4 py-2 max-h-80 overflow-y-auto space-y-0.5">
          {filtered.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-6">
              {filter ? 'No commands match your filter' : 'No new commands found'}
            </div>
          ) : (
            filtered.map((cmd) => {
              const isChecked = selected.has(cmd.executable)
              return (
                <button
                  key={cmd.executable}
                  onClick={() => toggle(cmd.executable)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-lighter transition-colors text-left"
                >
                  {isChecked ? (
                    <CheckSquare size={16} className="text-accent-light shrink-0" />
                  ) : (
                    <Square size={16} className="text-gray-600 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-sm font-mono truncate ${isChecked ? 'text-gray-200' : 'text-gray-400'}`}
                      >
                        {cmd.executable}
                      </span>
                      {cmd.alreadyAdded && (
                        <span className="shrink-0 rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent-light">
                          Added
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 truncate max-w-[240px]">
                    {cmd.path ?? 'Already added to TerminallySKILL'}
                  </span>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={selected.size === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={14} />
            Apply {selected.size} Command{selected.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
