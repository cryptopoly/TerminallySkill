import { create } from 'zustand'

interface BuilderStore {
  values: Record<string, unknown>
  setValue: (id: string, value: unknown) => void
  setValues: (values: Record<string, unknown>) => void
  resetValues: () => void
}

export const useBuilderStore = create<BuilderStore>((set) => ({
  values: {},
  setValue: (id, value) =>
    set((state) => ({
      values: { ...state.values, [id]: value }
    })),
  setValues: (values) => set({ values }),
  resetValues: () => set({ values: {} })
}))
