import { create } from 'zustand'

export interface TerminalSession {
  id: string
  active: boolean
  projectId: string | null
  mode: TerminalSessionMode
  vncWsPort?: number
  vncToken?: string
}

export type TerminalSessionMode = 'workspace-shell' | 'ssh-interactive' | 'vnc'
type SplitDirection = 'horizontal' | 'vertical'

interface TerminalStore {
  sessions: TerminalSession[]
  activeSessionId: string | null
  terminalVisible: boolean
  history: string[]
  /** Split pane state */
  splitSessionId: string | null
  splitDirection: SplitDirection
  focusedPane: 'primary' | 'secondary'
  addSession: (id: string, projectId?: string | null, mode?: TerminalSessionMode, vncWsPort?: number, vncToken?: string) => void
  removeSession: (id: string) => void
  setActiveSession: (id: string) => void
  setTerminalVisible: (visible: boolean) => void
  setSplitDirection: (direction: SplitDirection) => void
  addToHistory: (command: string) => void
  /** Split the terminal area: show activeSessionId + newSessionId together */
  splitTerminal: (direction: SplitDirection, newSessionId: string) => void
  /** Remove split and keep the focused pane's session active */
  unsplitTerminal: () => void
  /** Close a specific pane (by session ID) */
  closeSplitPane: (sessionId: string) => void
  /** Toggle focus between primary and secondary panes */
  setFocusedPane: (pane: 'primary' | 'secondary') => void
  toggleFocusedPane: () => void
}

export function filterSessionsForProject(
  sessions: TerminalSession[],
  projectId: string | null
): TerminalSession[] {
  return sessions.filter((session) => session.projectId === projectId)
}

export function resolveProjectTerminalContext(
  sessions: TerminalSession[],
  projectId: string | null,
  activeSessionId: string | null,
  splitSessionId: string | null
): {
  projectSessions: TerminalSession[]
  activeProjectSessionId: string | null
  splitProjectSessionId: string | null
} {
  const projectSessions = filterSessionsForProject(sessions, projectId)
  const sessionIds = new Set(projectSessions.map((session) => session.id))

  const activeProjectSessionId =
    activeSessionId && sessionIds.has(activeSessionId)
      ? activeSessionId
      : projectSessions[0]?.id ?? null

  const splitProjectSessionId =
    splitSessionId &&
    sessionIds.has(splitSessionId) &&
    splitSessionId !== activeProjectSessionId
      ? splitSessionId
      : null

  return {
    projectSessions,
    activeProjectSessionId,
    splitProjectSessionId
  }
}

export const useTerminalStore = create<TerminalStore>((set) => ({
  sessions: [],
  activeSessionId: null,
  terminalVisible: false,
  history: [],
  splitSessionId: null,
  splitDirection: 'vertical',
  focusedPane: 'primary',
  addSession: (id, projectId = null, mode = 'workspace-shell', vncWsPort, vncToken) =>
    set((state) => ({
      sessions: [
        ...state.sessions,
        {
          id, active: true, projectId: projectId ?? null, mode,
          ...(vncWsPort !== undefined ? { vncWsPort } : {}),
          ...(vncToken !== undefined ? { vncToken } : {})
        }
      ],
      activeSessionId: id,
      terminalVisible: true
    })),
  removeSession: (id) =>
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== id)
      // If removing a split pane session, unsplit
      let splitSessionId = state.splitSessionId
      let activeSessionId = state.activeSessionId
      if (splitSessionId === id) {
        splitSessionId = null
      } else if (activeSessionId === id && splitSessionId) {
        activeSessionId = splitSessionId
        splitSessionId = null
      }
      if (activeSessionId === id) {
        activeSessionId = sessions[0]?.id ?? null
      }
      return {
        sessions,
        activeSessionId,
        splitSessionId,
        focusedPane: 'primary',
        terminalVisible: sessions.length > 0,
      }
    }),
  setActiveSession: (id) =>
    set((state) => {
      if (state.splitSessionId && id === state.splitSessionId && state.activeSessionId && state.activeSessionId !== id) {
        return {
          activeSessionId: id,
          splitSessionId: state.activeSessionId,
          focusedPane: 'primary'
        }
      }

      return {
        activeSessionId: id,
        // If the selected tab is already in a split, keep it; otherwise clear split
        splitSessionId: state.splitSessionId === id || state.activeSessionId === id
          ? state.splitSessionId
          : null,
        focusedPane: 'primary'
      }
    }),
  setTerminalVisible: (visible) => set({ terminalVisible: visible }),
  setSplitDirection: (direction) => set({ splitDirection: direction }),
  addToHistory: (command) =>
    set((state) => ({
      history: [command, ...state.history.filter((c) => c !== command)].slice(0, 50)
    })),
  splitTerminal: (direction, newSessionId) =>
    set({
      splitSessionId: newSessionId,
      splitDirection: direction,
      focusedPane: 'secondary',
      terminalVisible: true
    }),
  unsplitTerminal: () =>
    set((state) => ({
      activeSessionId: state.focusedPane === 'secondary' && state.splitSessionId
        ? state.splitSessionId
        : state.activeSessionId,
      splitSessionId: null,
      focusedPane: 'primary'
    })),
  closeSplitPane: (sessionId) =>
    set((state) => {
      if (sessionId === state.splitSessionId) {
        // Closing secondary pane
        return { splitSessionId: null, focusedPane: 'primary' }
      }
      if (sessionId === state.activeSessionId && state.splitSessionId) {
        // Closing primary pane — promote secondary
        return {
          activeSessionId: state.splitSessionId,
          splitSessionId: null,
          focusedPane: 'primary'
        }
      }
      return {}
    }),
  setFocusedPane: (pane) => set({ focusedPane: pane }),
  toggleFocusedPane: () =>
    set((state) => ({
      focusedPane: state.splitSessionId
        ? (state.focusedPane === 'primary' ? 'secondary' : 'primary')
        : 'primary'
    }))
}))
