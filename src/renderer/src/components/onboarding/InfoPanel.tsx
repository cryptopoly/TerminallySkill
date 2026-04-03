import { useMemo, useState } from 'react'
import {
  X, FolderOpen, Star, ScrollText, TerminalSquare, FileText, Zap,
  Camera, Keyboard, Code2, Settings, Columns2, Search, Monitor
} from 'lucide-react'

interface Section {
  icon: React.ReactNode
  title: string
  color: string
  keywords?: string[]
  steps: { label: string; desc: string }[]
}

interface GuideSection extends Section {
  matchCount: number
  visibleSteps: Section['steps']
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getGuideMatchCount(section: Section, query: string): number {
  if (!query) return section.steps.length

  const sectionHaystack = [section.title, ...(section.keywords ?? [])].join(' ').toLowerCase()
  if (sectionHaystack.includes(query)) {
    return section.steps.length
  }

  return section.steps.reduce((count, step) => {
    const haystack = `${step.label} ${step.desc}`.toLowerCase()
    return haystack.includes(query) ? count + 1 : count
  }, 0)
}

function getVisibleGuideSteps(section: Section, query: string): Section['steps'] {
  if (!query) return section.steps

  const sectionHaystack = [section.title, ...(section.keywords ?? [])].join(' ').toLowerCase()
  if (sectionHaystack.includes(query)) {
    return section.steps
  }

  return section.steps.filter((step) => {
    const haystack = `${step.label} ${step.desc}`.toLowerCase()
    return haystack.includes(query)
  })
}

function highlightGuideText(text: string, query: string): React.ReactNode {
  const trimmed = query.trim()
  if (!trimmed) return text

  const matcher = new RegExp(`(${escapeRegExp(trimmed)})`, 'ig')
  const parts = text.split(matcher)

  return parts.map((part, index) => (
    index % 2 === 1
      ? (
        <span
          key={`${part}-${index}`}
          className="rounded-sm bg-surface-light px-0.5 text-accent-light ring-1 ring-inset ring-accent/20"
        >
          {part}
        </span>
      )
      : <span key={`${part}-${index}`}>{part}</span>
  ))
}

const SECTIONS: Section[] = [
  {
    icon: <FolderOpen size={16} />,
    title: 'Projects',
    color: 'text-accent',
    keywords: ['workspace', 'directory', 'environment', 'project settings', 'ssh', 'remote'],
    steps: [
      { label: 'Create a project', desc: 'Click the project selector in the title bar and choose "New project". Point it at a working directory — this becomes the root for your terminal sessions and file browser.' },
      { label: 'Switch projects', desc: 'Click the project name in the title bar at any time to switch context, or press ⌘P (Ctrl+P). Each project remembers its own favourite commands, scripts, and terminal sessions.' },
      { label: 'Project groups', desc: 'Organise projects into groups using the Group field when creating or editing a project. Groups appear as collapsible sections in the project selector — great for separating Servers, Work, Personal projects etc.' },
      { label: 'Project colours', desc: 'Each project gets a unique colour dot shown on terminal tabs and the sidebar, so you always know which project context you\'re in.' },
      { label: 'Local & SSH workspaces', desc: 'Projects can point at local folders or SSH remote hosts. Configure host, user, port, and identity file for SSH targets. The title bar shows the active workspace type.' },
      { label: 'SSH key setup', desc: 'Generate a key with ssh-keygen -t ed25519, then copy it to the server with ssh-copy-id user@host. Enter the key path in the project Identity File field — you\'ll never need a password again.' },
      { label: 'Environment variables', desc: 'In project settings, add KEY=VALUE pairs or import a .env file. Variables are injected into every new terminal session for that project. Toggle individual vars on or off without deleting them.' },
      { label: 'Starter packs', desc: 'When you create a project, TerminallySKILL detects repo signals (package.json, Dockerfile, Makefile, etc.) and auto-enables relevant command categories.' }
    ]
  },
  {
    icon: <Star size={16} />,
    title: 'Commands',
    color: 'text-caution',
    keywords: ['builder', 'flags', 'arguments', 'draft', 'ai review', 'ai draft'],
    steps: [
      { label: 'Browse commands', desc: 'The Commands tab lists every CLI tool TerminallySKILL knows about. Use the search box to filter instantly. Tools are auto-discovered from your system PATH.' },
      { label: 'Visual builder', desc: 'Click any command to open the form-based builder. Fill in flags and arguments with controls instead of memorising syntax — then copy or run the result.' },
      { label: 'AI Review', desc: 'Use AI Review to safety-check a built command before running it. The review includes a conversational follow-up chat so you can ask questions about the results.' },
      { label: 'AI Draft', desc: 'Describe what you want in natural language and AI Draft proposes a complete command with flags and arguments populated in the builder.' },
      { label: 'Editable preview', desc: 'The command preview stays live while you build. You can also tweak the final command text directly before copying or running it.' },
      { label: 'Add custom commands', desc: 'Click + in the Commands tab to add any executable. TerminallySKILL parses its --help output and generates a visual builder automatically.' },
      { label: 'Pin favourites', desc: 'Star a command to pin it to the top of the list for the active project. Recent commands also appear in a dedicated section.' }
    ]
  },
  {
    icon: <ScrollText size={16} />,
    title: 'Scripts',
    color: 'text-safe',
    keywords: ['workflow', 'approvals', 'inputs', 'tvflow', 'steps'],
    steps: [
      { label: 'Create a workflow script', desc: 'Open the Scripts tab in the sidebar and click +. Give it a name and description, then add steps such as commands, notes, and approval checkpoints.' },
      { label: 'Add inputs & approvals', desc: 'Workflow inputs let you reuse the same script with different values. Approval steps can pause a run or act as a visible checkpoint.' },
      { label: 'Run a script', desc: 'Click the play button next to any script to execute it. TerminallySKILL opens a terminal and runs all steps in order, with retry logic and continue-on-error per step.' },
      { label: 'Export & import', desc: 'Click the share icon on any script to export it as a `.tvflow` file. Others can import it into their own projects from the Scripts tab.' }
    ]
  },
  {
    icon: <Code2 size={16} />,
    title: 'Snippets',
    color: 'text-purple-400',
    keywords: ['template', 'placeholder', 'reuse', 'variables'],
    steps: [
      { label: 'Create a snippet', desc: 'Open the Snippets tab and click +. Write a command template with {{placeholders}} for dynamic values — e.g. docker run -p {{port}}:80 {{image}}.' },
      { label: 'Fill & run', desc: 'Click a snippet to open it. Fill in the placeholder fields, then click Run to execute the completed command in a terminal.' },
      { label: 'Copy resolved command', desc: 'Once placeholders are filled, use the copy button to grab the fully resolved command string for use elsewhere.' }
    ]
  },
  {
    icon: <TerminalSquare size={16} />,
    title: 'Terminal',
    color: 'text-accent-light',
    keywords: ['terminal', 'editor prompt', 'shell', 'split', 'queue', 'path fix', 'ssh', 'vnc', 'remote desktop'],
    steps: [
      { label: 'Open a terminal', desc: 'Click the terminal icon in the title bar, or press ⌘/ (Ctrl+/). Each tab runs a full shell in your project\'s working directory with env vars injected.' },
      { label: 'Editor Prompt mode', desc: 'In Settings, switch to Editor Prompt mode. When the shell is idle you get a command bar with ghost suggestions, history cycling (↑/↓), and safer paste handling.' },
      { label: 'AI review tools', desc: 'Review the full session or just the last command block with AI. Ask follow-up questions in a conversational chat. Right-click selected text to review just that portion.' },
      { label: 'Split panes', desc: 'Press ⌘D to split vertically (side by side) or ⌘⇧D to split horizontally (top/bottom). Press ⌘] and ⌘[ to switch focus between panes.' },
      { label: 'Command queue', desc: 'If you type while a command is running, your input is buffered and shown in an overlay. It runs automatically once the shell is free.' },
      { label: 'PATH fix', desc: 'If a command isn\'t found, a banner appears with a Fix PATH button that locates the binary and updates your shell config automatically.' },
      { label: 'Promote commands', desc: 'After running a command, promote it into a saved command, snippet, or workflow step directly from the terminal toolbar.' },
      { label: 'SSH shell tab', desc: 'On SSH projects, click the server icon in the tab bar to open a raw interactive SSH shell — useful for commands that need a live TTY.' },
      { label: 'VNC remote desktop', desc: 'On SSH projects, click the monitor icon in the tab bar to open an encrypted VNC session. The connection tunnels through SSH automatically — no extra port forwarding needed. Requires a VNC server (e.g. TigerVNC) running on the remote machine.' }
    ]
  },
  {
    icon: <Columns2 size={16} />,
    title: 'Runs & Logs',
    color: 'text-amber-300',
    keywords: ['logs', 'history', 'search', 'compare', 'structured runs', 'ai review'],
    steps: [
      { label: 'Unified log browser', desc: 'Workflow runs and terminal logs are merged in a single time-ordered list. Use the filter icons to show runs, logs, or both.' },
      { label: 'Structured run history', desc: 'Each workflow run records step timings, status, attempts, and linked logs. Open any run to see the full execution timeline.' },
      { label: 'Search saved logs', desc: 'Search across all saved terminal output. Matching lines are highlighted in the list and inside the opened log. Navigate matches with Enter and Shift+Enter.' },
      { label: 'Compare runs', desc: 'Open a saved run and click Compare Previous to diff it against the last run of the same workflow — spot regressions, fixes, or timing changes.' },
      { label: 'AI review & selection', desc: 'Right-click selected text in a log to copy it or send it to AI Review. Ask follow-up questions in the review chat for deeper analysis.' },
      { label: 'Open logs folder', desc: 'From the Logs view or project settings, jump straight to the underlying log folder on disk.' }
    ]
  },
  {
    icon: <Camera size={16} />,
    title: 'Output Capture & Diff',
    color: 'text-emerald-400',
    keywords: ['snapshots', 'diff', 'capture', 'compare'],
    steps: [
      { label: 'Capture a snapshot', desc: 'Press ⌘⇧S or click the camera icon in the terminal tab bar to save the current terminal output. Snapshots are stored as clean text.' },
      { label: 'Manage snapshots', desc: 'Click the camera badge to open the snapshot panel. Rename snapshots by double-clicking, copy content, or delete them.' },
      { label: 'Compare outputs', desc: 'In the snapshot panel, click the compare button and select two snapshots. A side-by-side diff viewer shows added, removed, and unchanged lines.' },
      { label: 'Search in terminal', desc: 'Press ⌘F to open the search bar. It supports case-sensitive, regex, and whole-word matching. Navigate matches with Enter and Shift+Enter.' }
    ]
  },
  {
    icon: <FileText size={16} />,
    title: 'Files',
    color: 'text-blue-400',
    keywords: ['editor', 'syntax highlight', 'code', 'file browser'],
    steps: [
      { label: 'Browse your project', desc: 'With a project active, open the Files tab in the sidebar. Navigate directories by clicking folder names.' },
      { label: 'View files', desc: 'Click any file to open it with syntax highlighting in the main panel. Large files are shown truncated, and very large files can be revealed in Finder instead.' },
      { label: 'Edit with code colours', desc: 'Editable files keep syntax colouring, line numbers, and a code-editor layout while you type instead of falling back to plain text.' }
    ]
  },
  {
    icon: <Zap size={16} />,
    title: 'AI Providers',
    color: 'text-yellow-400',
    keywords: ['ai', 'openai', 'anthropic', 'ollama', 'gemini', 'api key', 'local model', 'lm studio'],
    steps: [
      { label: 'Supported providers', desc: 'OpenAI, Anthropic, Google Gemini, OpenRouter, Groq, Mistral, Together.ai, Fireworks.ai, xAI (Grok), DeepSeek, plus any OpenAI-compatible endpoint.' },
      { label: 'Local models', desc: 'Connect to Ollama or LM Studio running locally — no API key needed, your data never leaves your machine.' },
      { label: 'Configure & test', desc: 'Open Settings, enable a provider, paste your API key, and click Test Connection. Set one provider as active for all AI features.' },
      { label: 'Routing & fallbacks', desc: 'Set a primary AI provider and optional fallbacks. If the primary fails, requests automatically try the next provider in your fallback list.' },
      { label: 'Privacy', desc: 'API keys are stored locally on your machine. No telemetry or data is sent anywhere except directly to your chosen provider.' }
    ]
  },
  {
    icon: <Settings size={16} />,
    title: 'Settings',
    color: 'text-gray-400',
    keywords: ['theme', 'preferences', 'updates', 'backup'],
    steps: [
      { label: 'Themes', desc: 'Open Settings from the gear icon in the title bar. Choose from 8 themes: Void, Ember, Dusk, Forest (dark), or Chalk, Latte, Sage, Mist (light).' },
      { label: 'Terminal input', desc: 'Choose between Classic shell input and Editor Prompt mode depending on how hands-on or guided you want the shell to feel.' },
      { label: 'Safe paste mode', desc: 'When enabled, pasting multi-line text into the terminal shows a confirmation dialog to prevent accidental execution of dangerous commands.' },
      { label: 'Log storage', desc: 'Control whether terminal sessions auto-save, pick a base log folder, and manage log retention from Settings or per-project.' },
      { label: 'App updates', desc: 'TerminallySKILL checks for updates on startup (configurable). Updates are downloaded and applied automatically.' },
      { label: 'Backup & restore', desc: 'Back up your app data (projects, scripts, snippets, settings) to a directory of your choice from Settings.' },
      { label: 'Help tooltips', desc: 'Toggle rich help tooltips on or off. When enabled, hovering over buttons shows descriptions and keyboard shortcuts in styled popups.' }
    ]
  },
  {
    icon: <Monitor size={16} />,
    title: 'Remote Desktop (VNC)',
    color: 'text-purple-400',
    keywords: ['vnc', 'remote desktop', 'tigervnc', 'vncserver', 'ssh tunnel', 'encrypted', 'display', 'xfce', 'desktop environment'],
    steps: [
      { label: 'How it works', desc: 'TerminallySKILL opens an SSH tunnel to your server and bridges it to a local WebSocket — all encrypted end-to-end. No ports need to be open beyond SSH.' },
      { label: 'Open a VNC tab', desc: 'With an SSH project active, click the monitor icon in the terminal tab bar. A VNC tab opens and connects automatically.' },
      { label: 'Install TigerVNC', desc: 'On the remote machine: apt update && apt install -y tigervnc-standalone-server. Then set a VNC password with vncpasswd.' },
      { label: 'Install a desktop environment', desc: 'VNC needs a GUI session to display. Install XFCE4 (lightweight, works great over VNC): apt install xfce4 xfce4-goodies -y' },
      { label: 'Configure the VNC startup', desc: 'Tell VNC to launch XFCE4: create ~/.vnc/xstartup with: #!/bin/sh, unset SESSION_MANAGER, unset DBUS_SESSION_BUS_ADDRESS, exec startxfce4 — then chmod +x ~/.vnc/xstartup' },
      { label: 'Start the VNC server', desc: 'Run: vncserver :1 -geometry 1920x1080 -depth 24. If it crashes immediately, check ~/.vnc/<hostname>:1.log for errors.' },
      { label: 'Check the server', desc: 'In your SSH tab, run ss -tlnp | grep 5901 to confirm the VNC server is listening before connecting.' },
      { label: 'Display numbers & ports', desc: 'Display :0 = port 5900, :1 = port 5901, and so on. The VNC button connects to port 5901 by default (display :1).' },
      { label: 'VNC password', desc: 'If the remote VNC server requires a password, a secure prompt will appear in the app — no browser dialog. The connection itself is encrypted via SSH regardless.' }
    ]
  },
  {
    icon: <Keyboard size={16} />,
    title: 'Keyboard Shortcuts',
    color: 'text-gray-500',
    keywords: ['shortcuts', 'keys', 'hotkeys'],
    steps: [
      { label: '⌘/', desc: 'Toggle the terminal panel — opens it if no terminal exists, or hides/shows it.' },
      { label: '⌘K', desc: 'Open the command palette for quick access to any action, command, script, or snippet.' },
      { label: '⌘P', desc: 'Open the project switcher — search and switch between projects without reaching for the mouse.' },
      { label: '⌘D', desc: 'Split the terminal vertically (side by side).' },
      { label: '⌘⇧D', desc: 'Split the terminal horizontally (top and bottom).' },
      { label: '⌘] / ⌘[', desc: 'Switch focus between split terminal panes.' },
      { label: '⌘F', desc: 'Open the search bar in the active terminal.' },
      { label: '⌘⇧F', desc: 'Open Find in Files — search across all files in the active project directory.' },
      { label: '⌘W', desc: 'Close the active file tab in the editor (with an unsaved-changes prompt if needed).' },
      { label: '⌘⇧S', desc: 'Capture a snapshot of the active terminal output.' },
      { label: '⌘I', desc: 'Open this help guide.' },
      { label: '⌘T', desc: 'Open a new terminal tab.' },
    ]
  },
]

export function InfoPanel({ onClose, initialSection }: { onClose: () => void; initialSection?: string }): JSX.Element {
  const [searchQuery, setSearchQuery] = useState(initialSection ?? '')
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredSections = useMemo<GuideSection[]>(() => (
    SECTIONS
      .map((section) => ({
        ...section,
        matchCount: getGuideMatchCount(section, normalizedQuery),
        visibleSteps: getVisibleGuideSteps(section, normalizedQuery)
      }))
      .filter((section) => section.matchCount > 0)
  ), [normalizedQuery])
  const totalMatches = useMemo(
    () => filteredSections.reduce((count, section) => count + section.matchCount, 0),
    [filteredSections]
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[640px] max-h-[85vh] bg-surface border border-surface-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-border shrink-0">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-200">How to use TerminallySKILL</h2>
            <p className="text-xs text-gray-500 mt-0.5">Visual command builder, terminal workspace, workflows, logs, and AI tools</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-surface-light transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-surface-border shrink-0 space-y-3 bg-surface-light/40">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search setup, shortcuts, logs, AI, SSH, VNC, remote desktop..."
              className="w-full rounded-lg border border-surface-border bg-surface pl-9 pr-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] text-gray-500">
            <span>
              {normalizedQuery
                ? `${totalMatches} matching ${totalMatches === 1 ? 'item' : 'items'}`
                : `${SECTIONS.length} guide sections`}
            </span>
            {normalizedQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="rounded-md border border-surface-border px-2 py-1 text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {!normalizedQuery && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-accent/20 bg-accent/10 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-light">Start Here</div>
                <p className="mt-2 text-sm text-gray-200">Create a project, open a terminal, and decide whether you want Classic or Editor Prompt mode.</p>
              </div>
              <div className="rounded-xl border border-surface-border bg-surface-light p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Good To Know</div>
                <p className="mt-2 text-sm text-gray-300">Logs, workflows, SSH targets, and AI actions all live inside the same project context.</p>
              </div>
            </div>
          )}

          {filteredSections.length === 0 ? (
            <div className="rounded-xl border border-surface-border bg-surface-light px-4 py-6 text-center">
              <div className="text-sm font-medium text-gray-300">No guide matches</div>
              <p className="mt-1 text-xs text-gray-500">Try a broader term like `terminal`, `logs`, `AI`, `SSH`, or `shortcut`.</p>
            </div>
          ) : (
            filteredSections.map((section) => (
              <div key={section.title}>
                <div className={`flex items-center gap-2 mb-3 ${section.color}`}>
                  {section.icon}
                  <h3 className="text-sm font-semibold">{highlightGuideText(section.title, searchQuery)}</h3>
                  {normalizedQuery && (
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-500">
                      {section.matchCount} match{section.matchCount === 1 ? '' : 'es'}
                    </span>
                  )}
                </div>
                <div className="space-y-2 ml-6">
                  {section.visibleSteps.map((step) => (
                    <div key={step.label} className="flex gap-3">
                      <span className="text-xs font-medium text-gray-300 shrink-0 mt-0.5 w-40">
                        {highlightGuideText(step.label, searchQuery)}
                      </span>
                      <span className="text-xs text-gray-500 leading-relaxed">
                        {highlightGuideText(step.desc, searchQuery)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-border shrink-0 flex items-center justify-between">
          <span className="text-xs text-gray-600">TerminallySKILL — visual command builder &amp; terminal tools</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-light text-white text-xs font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
