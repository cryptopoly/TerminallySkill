import { create } from 'zustand'

export interface OutputSnapshot {
  id: string
  sessionId: string
  label: string
  content: string
  lineCount: number
  capturedAt: string
  projectId: string | null
}

interface SnapshotStore {
  snapshots: OutputSnapshot[]
  /** IDs of two snapshots selected for diffing (max 2) */
  diffSelection: [string, string] | null
  /** Whether the diff viewer is open */
  diffOpen: boolean
  addSnapshot: (snapshot: OutputSnapshot) => void
  removeSnapshot: (id: string) => void
  renameSnapshot: (id: string, label: string) => void
  clearSnapshots: () => void
  setDiffSelection: (ids: [string, string] | null) => void
  openDiff: (a: string, b: string) => void
  closeDiff: () => void
}

export const useSnapshotStore = create<SnapshotStore>((set) => ({
  snapshots: [],
  diffSelection: null,
  diffOpen: false,
  addSnapshot: (snapshot) =>
    set((state) => ({
      snapshots: [snapshot, ...state.snapshots].slice(0, 50)
    })),
  removeSnapshot: (id) =>
    set((state) => ({
      snapshots: state.snapshots.filter((s) => s.id !== id),
      diffSelection: state.diffSelection?.includes(id) ? null : state.diffSelection
    })),
  renameSnapshot: (id, label) =>
    set((state) => ({
      snapshots: state.snapshots.map((s) =>
        s.id === id ? { ...s, label } : s
      )
    })),
  clearSnapshots: () => set({ snapshots: [], diffSelection: null, diffOpen: false }),
  setDiffSelection: (ids) => set({ diffSelection: ids }),
  openDiff: (a, b) => set({ diffSelection: [a, b], diffOpen: true }),
  closeDiff: () => set({ diffOpen: false })
}))
