import { useState } from 'react'
import { Camera, Trash2, ArrowLeftRight, Copy, X } from 'lucide-react'
import { useSnapshotStore } from '../../store/snapshot-store'
import { HelpTip } from '../ui/HelpTip'

interface SnapshotPanelProps {
  onClose: () => void
}

export function SnapshotPanel({ onClose }: SnapshotPanelProps): JSX.Element {
  const { snapshots, removeSnapshot, renameSnapshot, openDiff, clearSnapshots } = useSnapshotStore()
  const [diffMode, setDiffMode] = useState(false)
  const [diffPicks, setDiffPicks] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleTogglePick = (id: string): void => {
    if (diffPicks.includes(id)) {
      setDiffPicks(diffPicks.filter((p) => p !== id))
    } else if (diffPicks.length < 2) {
      const next = [...diffPicks, id]
      setDiffPicks(next)
      if (next.length === 2) {
        openDiff(next[0], next[1])
        setDiffMode(false)
        setDiffPicks([])
        onClose()
      }
    }
  }

  const handleCopy = async (content: string): Promise<void> => {
    await window.electronAPI.writeClipboard(content)
  }

  const handleStartRename = (id: string, currentLabel: string): void => {
    setEditingId(id)
    setEditValue(currentLabel)
  }

  const handleSaveRename = (): void => {
    if (editingId && editValue.trim()) {
      renameSnapshot(editingId, editValue.trim())
    }
    setEditingId(null)
  }

  return (
    <div className="absolute top-0 right-0 bottom-0 w-72 bg-surface-light/95 backdrop-blur-sm border-l border-surface-border z-30 flex flex-col shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-1.5">
          <Camera size={13} className="text-accent" />
          <span className="text-xs font-semibold text-gray-200">Snapshots</span>
          <span className="text-[10px] text-gray-500">({snapshots.length})</span>
        </div>
        <div className="flex items-center gap-1">
          {snapshots.length >= 2 && (
            <HelpTip label="Compare" description="Select two snapshots to see differences">
              <button
                onClick={() => {
                  setDiffMode(!diffMode)
                  setDiffPicks([])
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  diffMode
                    ? 'bg-accent/15 text-accent'
                    : 'text-gray-500 hover:text-accent-light'
                }`}
              >
                <ArrowLeftRight size={11} />
              </button>
            </HelpTip>
          )}
          {snapshots.length > 0 && (
            <HelpTip label="Clear All" description="Remove all saved snapshots">
              <button
                onClick={clearSnapshots}
                className="px-1.5 py-0.5 rounded text-[10px] text-gray-600 hover:text-destructive transition-colors"
              >
                <Trash2 size={11} />
              </button>
            </HelpTip>
          )}
          <button
            onClick={onClose}
            className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Diff mode instruction */}
      {diffMode && (
        <div className="px-3 py-1.5 bg-accent/10 border-b border-accent/20 shrink-0">
          <span className="text-[10px] text-accent">
            Select 2 snapshots to compare ({diffPicks.length}/2)
          </span>
        </div>
      )}

      {/* Snapshot list */}
      <div className="flex-1 overflow-y-auto">
        {snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 px-4 text-center">
            <Camera size={24} className="mb-2 text-gray-700" />
            <p className="text-xs">No snapshots yet</p>
            <p className="text-[10px] mt-1 text-gray-700">
              Click the camera icon in the tab bar or press ⌘⇧S to capture terminal output
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {snapshots.map((snap) => {
              const isPicked = diffPicks.includes(snap.id)
              const isEditing = editingId === snap.id

              return (
                <div
                  key={snap.id}
                  className={`rounded-lg border p-2 group transition-colors ${
                    isPicked
                      ? 'border-accent/40 bg-accent/10'
                      : 'border-surface-border hover:border-surface-border/80 bg-surface/50'
                  } ${diffMode ? 'cursor-pointer' : ''}`}
                  onClick={() => diffMode && handleTogglePick(snap.id)}
                >
                  {/* Label */}
                  {isEditing ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleSaveRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename()
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="w-full bg-surface border border-accent/30 rounded px-1.5 py-0.5 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-accent"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div
                      className="text-xs text-gray-200 font-medium truncate cursor-text"
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        handleStartRename(snap.id, snap.label)
                      }}
                      title="Double-click to rename"
                    >
                      {snap.label}
                    </div>
                  )}

                  {/* Meta */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-600">
                      {new Date(snap.capturedAt).toLocaleTimeString()} · {snap.lineCount} lines
                    </span>

                    {!diffMode && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopy(snap.content)
                          }}
                          className="p-0.5 text-gray-500 hover:text-accent-light transition-colors"
                          title="Copy to clipboard"
                        >
                          <Copy size={10} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeSnapshot(snap.id)
                          }}
                          className="p-0.5 text-gray-500 hover:text-destructive transition-colors"
                          title="Delete snapshot"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
