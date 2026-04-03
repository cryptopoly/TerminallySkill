import { create } from 'zustand'
import type { Project, ProjectSidebarTab } from '../../../shared/project-schema'
import { buildEnvOverrides } from '../../../shared/project-schema'

interface ProjectStore {
  projects: Project[]
  activeProject: Project | null
  loading: boolean
  setProjects: (projects: Project[]) => void
  setActiveProject: (project: Project | null) => void
  setLoading: (loading: boolean) => void
  setSidebarTab: (tab: ProjectSidebarTab) => void
  updateProjectInStore: (project: Project) => void
  removeProjectFromStore: (id: string) => void
  /** Get env overrides for the active project (for passing to createTerminal) */
  getActiveEnvOverrides: () => Record<string, string> | undefined
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  activeProject: null,
  loading: true,
  setProjects: (projects) => set({ projects }),
  setActiveProject: (project) => set({ activeProject: project }),
  setLoading: (loading) => set({ loading }),
  setSidebarTab: (tab) => {
    const currentProject = useProjectStore.getState().activeProject
    if (!currentProject || currentProject.workspaceLayout.sidebarTab === tab) return

    const nextProject: Project = {
      ...currentProject,
      workspaceLayout: {
        ...currentProject.workspaceLayout,
        sidebarTab: tab
      }
    }

    set((state) => ({
      projects: state.projects.map((project) => (project.id === nextProject.id ? nextProject : project)),
      activeProject: nextProject
    }))

    if (typeof window === 'undefined' || typeof window.electronAPI === 'undefined') return

    void window.electronAPI
      .updateProject(currentProject.id, {
        workspaceLayout: {
          sidebarTab: tab
        }
      })
      .then((updatedProject) => {
        if (updatedProject) {
          useProjectStore.getState().updateProjectInStore(updatedProject)
        }
      })
      .catch((error) => {
        console.error('Failed to persist sidebar tab:', error)
      })
  },
  updateProjectInStore: (project) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === project.id ? project : p)),
      activeProject: state.activeProject?.id === project.id ? project : state.activeProject
    })),
  removeProjectFromStore: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProject: state.activeProject?.id === id ? null : state.activeProject
    })),
  getActiveEnvOverrides: () => {
    const project = useProjectStore.getState().activeProject
    return project ? buildEnvOverrides(project.envVars ?? []) : undefined
  }
}))

if (typeof document !== 'undefined') {
  document.title = useProjectStore.getState().activeProject?.name ?? 'TerminallySKILL'
  useProjectStore.subscribe((state) => {
    const nextTitle = state.activeProject?.name ?? 'TerminallySKILL'
    if (document.title !== nextTitle) {
      document.title = nextTitle
    }
  })
}
