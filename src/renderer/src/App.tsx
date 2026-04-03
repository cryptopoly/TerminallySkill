import { Component, useEffect, type ReactNode } from 'react'
import { useCommandStore } from './store/command-store'
import { useProjectStore } from './store/project-store'
import { useScriptStore } from './store/script-store'
import { useSnippetStore } from './store/snippet-store'
import { useSettingsStore } from './store/settings-store'
import { AppShell } from './components/layout/AppShell'

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error }
  }
  render(): ReactNode {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', color: '#ff6b6b', background: '#1a1a2e', height: '100vh', overflow: 'auto' }}>
          <h1 style={{ fontSize: 18, marginBottom: 16 }}>React render error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#ccc' }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#888', marginTop: 12 }}>{this.state.error.stack}</pre>
          <button
            style={{ marginTop: 16, padding: '8px 16px', background: '#333', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App(): JSX.Element {
  const setCommands = useCommandStore((s) => s.setCommands)
  const { setProjects, setActiveProject, setLoading } = useProjectStore()
  const setScripts = useScriptStore((s) => s.setScripts)
  const setSnippets = useSnippetStore((s) => s.setSnippets)
  const setSettings = useSettingsStore((s) => s.setSettings)

  useEffect(() => {
    window.electronAPI.loadAllCommands().then(setCommands)
    window.electronAPI.getAllScripts().then(setScripts)
    window.electronAPI.getAllSnippets().then(setSnippets)
    window.electronAPI.getSettings().then(setSettings)

    window.electronAPI.getAllProjects().then((data) => {
      setProjects(data.projects)
      // If opened with a projectId query param, use that; otherwise fall back to persisted active
      const params = new URLSearchParams(window.location.search)
      const requestedProjectId = params.get('projectId') ?? data.activeProjectId
      const active = data.projects.find((p) => p.id === requestedProjectId) ?? null
      setActiveProject(active)
      setLoading(false)
    })
  }, [setCommands, setProjects, setActiveProject, setLoading, setScripts, setSnippets, setSettings])

  return <ErrorBoundary><AppShell /></ErrorBoundary>
}
