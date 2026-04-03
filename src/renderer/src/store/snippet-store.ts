import { create } from 'zustand'
import type { Snippet } from '../../../shared/snippet-schema'
import { useFileStore } from './file-store'

interface SnippetStore {
  snippets: Snippet[]
  activeSnippet: Snippet | null
  setSnippets: (snippets: Snippet[]) => void
  setActiveSnippet: (snippet: Snippet | null) => void
  addSnippetToStore: (snippet: Snippet) => void
  updateSnippetInStore: (snippet: Snippet) => void
  removeSnippetFromStore: (id: string) => void
}

export const useSnippetStore = create<SnippetStore>((set) => ({
  snippets: [],
  activeSnippet: null,
  setSnippets: (snippets) => set({ snippets }),
  setActiveSnippet: (snippet) => {
    if (snippet) {
      useFileStore.getState().setFileViewerVisible(false)
    }
    set({ activeSnippet: snippet })
  },
  addSnippetToStore: (snippet) =>
    set((s) => ({ snippets: [...s.snippets, snippet] })),
  updateSnippetInStore: (snippet) =>
    set((s) => ({
      snippets: s.snippets.map((sn) => (sn.id === snippet.id ? snippet : sn)),
      activeSnippet: s.activeSnippet?.id === snippet.id ? snippet : s.activeSnippet
    })),
  removeSnippetFromStore: (id) =>
    set((s) => ({
      snippets: s.snippets.filter((sn) => sn.id !== id),
      activeSnippet: s.activeSnippet?.id === id ? null : s.activeSnippet
    }))
}))
