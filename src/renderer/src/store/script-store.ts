import { create } from 'zustand'
import type { Script } from '../../../shared/script-schema'
import type { Project } from '../../../shared/project-schema'
import { useFileStore } from './file-store'

interface ScriptStore {
  scripts: Script[]
  activeScript: Script | null
  loading: boolean
  setScripts: (scripts: Script[]) => void
  setActiveScript: (script: Script | null) => void
  setLoading: (loading: boolean) => void
  updateScriptInStore: (script: Script) => void
  addScriptToStore: (script: Script) => void
  removeScriptFromStore: (id: string) => void
}

export function resolveProjectScopedActiveScript(
  scripts: Script[],
  activeProject: Project | null,
  activeScript: Script | null
): Script | null {
  if (!activeScript) return null
  if (!activeProject) return activeScript

  const enabledScripts = scripts.filter((script) =>
    activeProject.enabledScriptIds.includes(script.id)
  )

  if (enabledScripts.some((script) => script.id === activeScript.id)) {
    return activeScript
  }

  const originId = activeScript.sourceScriptId ?? activeScript.id
  const matchingClone =
    enabledScripts.find(
      (script) =>
        script.projectId === activeProject.id &&
        (script.sourceScriptId ?? script.id) === originId
    ) ??
    enabledScripts.find(
      (script) =>
        script.projectId === null &&
        (script.sourceScriptId ?? script.id) === originId
    ) ??
    null

  return matchingClone
}

export const useScriptStore = create<ScriptStore>((set) => ({
  scripts: [],
  activeScript: null,
  loading: true,
  setScripts: (scripts) => set({ scripts, loading: false }),
  setActiveScript: (script) => {
    if (script) {
      useFileStore.getState().setFileViewerVisible(false)
    }
    set({ activeScript: script })
  },
  setLoading: (loading) => set({ loading }),
  updateScriptInStore: (script) =>
    set((state) => ({
      scripts: state.scripts.map((s) => (s.id === script.id ? script : s)),
      activeScript: state.activeScript?.id === script.id ? script : state.activeScript
    })),
  addScriptToStore: (script) =>
    set((state) => ({
      scripts: state.scripts.some((existing) => existing.id === script.id)
        ? state.scripts.map((existing) => (existing.id === script.id ? script : existing))
        : [...state.scripts, script],
      activeScript: state.activeScript?.id === script.id ? script : state.activeScript
    })),
  removeScriptFromStore: (id) =>
    set((state) => ({
      scripts: state.scripts.filter((s) => s.id !== id),
      activeScript: state.activeScript?.id === id ? null : state.activeScript
    }))
}))
