import { beforeEach, describe, expect, it } from 'vitest'
import { filterSessionsForProject, resolveProjectTerminalContext, useTerminalStore } from './terminal-store'

function resetTerminalStore(): void {
  useTerminalStore.setState({
    sessions: [],
    activeSessionId: null,
    terminalVisible: false,
    history: [],
    splitSessionId: null,
    splitDirection: 'vertical',
    focusedPane: 'primary'
  })
}

describe('terminal-store', () => {
  beforeEach(() => {
    resetTerminalStore()
  })

  it('swaps primary and secondary sessions when activating the split tab', () => {
    const store = useTerminalStore.getState()

    store.addSession('term-1', 'project-a')
    store.addSession('term-2', 'project-a')
    useTerminalStore.setState({
      activeSessionId: 'term-1',
      splitSessionId: 'term-2',
      focusedPane: 'secondary'
    })

    useTerminalStore.getState().setActiveSession('term-2')

    const nextState = useTerminalStore.getState()
    expect(nextState.activeSessionId).toBe('term-2')
    expect(nextState.splitSessionId).toBe('term-1')
    expect(nextState.focusedPane).toBe('primary')
  })

  it('filters sessions to the active project and resolves a visible fallback session', () => {
    const sessions = [
      { id: 'term-a1', active: true, projectId: 'project-a', mode: 'workspace-shell' as const },
      { id: 'term-a2', active: true, projectId: 'project-a', mode: 'workspace-shell' as const },
      { id: 'term-b1', active: true, projectId: 'project-b', mode: 'workspace-shell' as const }
    ]

    expect(filterSessionsForProject(sessions, 'project-a').map((session) => session.id)).toEqual([
      'term-a1',
      'term-a2'
    ])

    expect(resolveProjectTerminalContext(sessions, 'project-a', 'term-b1', null)).toEqual({
      projectSessions: [sessions[0], sessions[1]],
      activeProjectSessionId: 'term-a1',
      splitProjectSessionId: null
    })
  })
})
