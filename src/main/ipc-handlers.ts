import { ipcMain, BrowserWindow, dialog, clipboard, shell } from 'electron'
import { execFile } from 'child_process'
import { startVncSession, stopVncSession } from './vnc-manager'
import { getVncPassword, saveVncPassword, deleteVncPassword } from './vnc-credentials'
import type { SSHProjectWorkspaceTarget } from '../shared/project-schema'
import * as fs from 'fs'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { loadAllCommands } from './command-loader'
import { createTerminal, writeToTerminal, resizeTerminal, killTerminal, getSessionInfo } from './pty-manager'
import { detectNewCommands, findCommand, addDirToShellPath, getShellConfigPath } from './command-detector'
import { parseHelpOutput } from './help-parser'
import { searchInstallableCommands } from './cli-install-manager'
import {
  addDiscoveredCommands,
  addManualCommand,
  removeDiscoveredCommand,
  resetCommandTrees,
  saveEnrichedCommand,
  saveEnrichedBulk
} from './discovered-command-manager'
import type { DiscoveredCommand, CommandDefinition } from '../shared/command-schema'
import {
  saveSessionLog,
  getLogIndex,
  getLogsByProject,
  readLogContent,
  searchLogs,
  deleteLog,
  getLogBasePath
} from './log-manager'
import { getRunIndex, searchRuns, upsertRunRecord } from './run-manager'
import {
  getAllProjects,
  detectProjectStarterPack,
  createProject,
  updateProject,
  deleteProject,
  setActiveProject,
  toggleFavoriteCommand,
  addRecentCommand,
  listDirectoryContents,
  createEmptyFile,
  openInSystemExplorer,
  revealInSystemExplorer
} from './project-manager'
import { testWorkspaceTargetConnection } from './workspace-target-manager'
import {
  getAllScripts,
  getScriptsByProject,
  createScript,
  updateScript,
  deleteScript,
  addStepToScript,
  addApprovalStepToScript,
  addNoteStepToScript,
  removeStepFromScript,
  reorderScriptSteps,
  markScriptRun,
  duplicateScript,
  cloneScriptToProject,
  exportScript,
  importScript
} from './script-manager'
import {
  getAllSnippets,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  duplicateSnippet,
  markSnippetRun
} from './snippet-manager'
import { getTVFlowName, isTVFlowFile, type TVFlowFile } from '../shared/tvflow-schema'
import type { AIProvider } from '../shared/settings-schema'
import type { ProjectWorkspaceTarget } from '../shared/project-schema'
import { getSettings, updateSettings, updateProvider, testAIConnection, listAIModels } from './settings-manager'
import { runAIAction } from './ai-manager'
import { checkForAppUpdate, downloadAndOpenAppUpdate, getAppVersion } from './update-manager'
import { createAppDataBackup, getDefaultICloudBackupDirectory } from './backup-manager'
import { getUserDataDir, getCustomDataDir, setCustomDataDir } from './user-data-path'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, async () => {
    return getAppVersion()
  })

  ipcMain.handle(IPC_CHANNELS.APP_CHECK_UPDATES, async () => {
    return checkForAppUpdate()
  })

  ipcMain.handle(IPC_CHANNELS.APP_DOWNLOAD_UPDATE, async () => {
    return downloadAndOpenAppUpdate()
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_DEFAULT_ICLOUD_BACKUP_DIR, async () => {
    return getDefaultICloudBackupDirectory()
  })

  ipcMain.handle(IPC_CHANNELS.APP_CREATE_BACKUP, async (_event, targetDirectory: string) => {
    return createAppDataBackup(targetDirectory)
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_DATA_DIR_INFO, () => {
    const defaultDir = getUserDataDir()
    const customDir = getCustomDataDir()
    return {
      currentPath: customDir ?? defaultDir,
      defaultPath: defaultDir,
      isCustom: customDir !== null
    }
  })

  ipcMain.handle(IPC_CHANNELS.APP_MOVE_DATA_DIR, async (_event, targetDirectory: string) => {
    const { join } = await import('path')
    const { existsSync, mkdirSync, cpSync, writeFileSync, readFileSync } = await import('fs')

    // Validate target
    if (!existsSync(targetDirectory)) {
      throw new Error(`Target directory does not exist: ${targetDirectory}`)
    }

    const defaultDir = getUserDataDir()
    const currentDir = getCustomDataDir() ?? defaultDir

    const sourceDataDir = join(currentDir, 'data')
    const sourceLogsDir = join(currentDir, 'logs')
    const targetDataDir = join(targetDirectory, 'data')
    const targetLogsDir = join(targetDirectory, 'logs')

    // Copy data/ if it exists
    if (existsSync(sourceDataDir)) {
      mkdirSync(targetDataDir, { recursive: true })
      cpSync(sourceDataDir, targetDataDir, { recursive: true })
    }

    // Copy logs/ if it exists
    if (existsSync(sourceLogsDir)) {
      mkdirSync(targetLogsDir, { recursive: true })
      cpSync(sourceLogsDir, targetLogsDir, { recursive: true })
    }

    // Always update the bootstrap settings.json in the default userData location
    const bootstrapSettingsPath = join(defaultDir, 'data', 'settings.json')
    if (existsSync(bootstrapSettingsPath)) {
      const raw = JSON.parse(readFileSync(bootstrapSettingsPath, 'utf-8'))
      raw.customDataDirectory = targetDirectory
      writeFileSync(bootstrapSettingsPath, JSON.stringify(raw, null, 2), 'utf-8')
    }

    // Also update the settings.json in the NEW location
    const newSettingsPath = join(targetDataDir, 'settings.json')
    if (existsSync(newSettingsPath)) {
      const raw = JSON.parse(readFileSync(newSettingsPath, 'utf-8'))
      raw.customDataDirectory = targetDirectory
      writeFileSync(newSettingsPath, JSON.stringify(raw, null, 2), 'utf-8')
    }

    setCustomDataDir(targetDirectory)
    return { success: true, path: targetDirectory }
  })

  ipcMain.handle(IPC_CHANNELS.APP_RESET_DATA_DIR, async () => {
    const { join } = await import('path')
    const { existsSync, mkdirSync, cpSync, writeFileSync, readFileSync } = await import('fs')

    const customDir = getCustomDataDir()
    if (!customDir) return { success: true }

    const defaultDir = getUserDataDir()

    const sourceDataDir = join(customDir, 'data')
    const sourceLogsDir = join(customDir, 'logs')
    const targetDataDir = join(defaultDir, 'data')
    const targetLogsDir = join(defaultDir, 'logs')

    // Copy data back
    if (existsSync(sourceDataDir)) {
      mkdirSync(targetDataDir, { recursive: true })
      cpSync(sourceDataDir, targetDataDir, { recursive: true })
    }

    // Copy logs back
    if (existsSync(sourceLogsDir)) {
      mkdirSync(targetLogsDir, { recursive: true })
      cpSync(sourceLogsDir, targetLogsDir, { recursive: true })
    }

    // Clear custom directory from settings
    const settingsPath = join(targetDataDir, 'settings.json')
    if (existsSync(settingsPath)) {
      const raw = JSON.parse(readFileSync(settingsPath, 'utf-8'))
      raw.customDataDirectory = ''
      writeFileSync(settingsPath, JSON.stringify(raw, null, 2), 'utf-8')
    }

    setCustomDataDir(null)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.COMMANDS_LOAD_ALL, async () => {
    return loadAllCommands()
  })

  ipcMain.handle(
    IPC_CHANNELS.PTY_CREATE,
    async (event, cwd?: string, projectId?: string, projectName?: string, projectWorkingDir?: string, envOverrides?: Record<string, string>) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) throw new Error('No window found for PTY creation')
      return createTerminal(win, cwd, projectId, projectName, projectWorkingDir, envOverrides)
    }
  )

  ipcMain.on(IPC_CHANNELS.PTY_WRITE, (_event, sessionId: string, data: string) => {
    writeToTerminal(sessionId, data)
  })

  ipcMain.on(IPC_CHANNELS.PTY_RESIZE, (_event, sessionId: string, cols: number, rows: number) => {
    resizeTerminal(sessionId, cols, rows)
  })

  ipcMain.on(IPC_CHANNELS.PTY_KILL, (_event, sessionId: string) => {
    killTerminal(sessionId)
  })

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FILE, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.CLIPBOARD_WRITE, (_event, text: string) => {
    clipboard.writeText(text)
  })

  ipcMain.handle(IPC_CHANNELS.SHELL_GET_DEFAULT, () => {
    if (process.platform === 'win32') return 'powershell.exe'
    return process.env.SHELL || '/bin/zsh'
  })

  // Project handlers
  ipcMain.handle(IPC_CHANNELS.PROJECTS_GET_ALL, async () => {
    return getAllProjects()
  })

  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_DETECT_STARTER_PACK,
    async (_event, workingDirectory: string) => {
      return detectProjectStarterPack(workingDirectory)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_CREATE,
    async (
      _event,
      name: string,
      workingDirectory: string,
      color?: string,
      workspaceTarget?: ProjectWorkspaceTarget,
      logPreference?: 'inherit' | 'enabled' | 'disabled',
      skipStarterPack?: boolean
    ) => {
      return createProject(name, workingDirectory, color, workspaceTarget, logPreference, skipStarterPack)
    }
  )

  ipcMain.handle(IPC_CHANNELS.PROJECTS_UPDATE, async (_event, id: string, updates: object) => {
    return updateProject(id, updates)
  })

  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_TEST_WORKSPACE_TARGET,
    async (_event, workspaceTarget: ProjectWorkspaceTarget) => {
      return testWorkspaceTargetConnection(workspaceTarget)
    }
  )

  ipcMain.handle(IPC_CHANNELS.PROJECTS_DELETE, async (_event, id: string) => {
    return deleteProject(id)
  })

  ipcMain.handle(IPC_CHANNELS.PROJECTS_SET_ACTIVE, async (_event, id: string) => {
    return setActiveProject(id)
  })

  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_TOGGLE_FAVORITE,
    async (_event, projectId: string, commandId: string) => {
      return toggleFavoriteCommand(projectId, commandId)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_ADD_RECENT,
    async (_event, projectId: string, commandId: string, commandString: string) => {
      return addRecentCommand(projectId, commandId, commandString)
    }
  )

  // File browser handlers
  ipcMain.handle(
    IPC_CHANNELS.FILES_LIST_DIR,
    async (_event, dirPath: string, includeHidden?: boolean) => {
      return listDirectoryContents(dirPath, includeHidden)
    }
  )

  ipcMain.handle(IPC_CHANNELS.FILES_CREATE_FILE, async (_event, filePath: string) => {
    try {
      await createEmptyFile(filePath)
      return { success: true }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FILES_GET_METADATA, async (_event, filePath: string) => {
    try {
      const stat = fs.statSync(filePath)
      return { size: stat.size, modifiedAt: stat.mtimeMs }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FILES_READ_CONTENT, async (_event, filePath: string) => {
    try {
      const PREVIEW_BYTES = 5 * 1024 * 1024  // 5 MB — read and show truncated
      const MAX_BYTES     = 50 * 1024 * 1024 // 50 MB — refuse to open at all
      const stat = fs.statSync(filePath)
      if (stat.size > MAX_BYTES) {
        // File is too large to even attempt — return a flag without reading
        return { tooLarge: true, size: stat.size, modifiedAt: stat.mtimeMs }
      }
      if (stat.size > PREVIEW_BYTES) {
        // Read only the first 5 MB and flag as truncated
        const fd = fs.openSync(filePath, 'r')
        const buf = Buffer.alloc(PREVIEW_BYTES)
        fs.readSync(fd, buf, 0, PREVIEW_BYTES, 0)
        fs.closeSync(fd)
        return { content: buf.toString('utf8'), truncated: true, size: stat.size, modifiedAt: stat.mtimeMs }
      }
      const content = fs.readFileSync(filePath, 'utf8')
      return { content, truncated: false, size: stat.size, modifiedAt: stat.mtimeMs }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FILES_WRITE_CONTENT, async (_event, filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content, 'utf8')
      const stat = fs.statSync(filePath)
      return { success: true, size: Buffer.byteLength(content, 'utf8'), modifiedAt: stat.mtimeMs }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FILES_OPEN_IN_EXPLORER, async (_event, dirPath: string) => {
    return openInSystemExplorer(dirPath)
  })

  ipcMain.handle(IPC_CHANNELS.FILES_REVEAL_IN_EXPLORER, async (_event, filePath: string) => {
    return revealInSystemExplorer(filePath)
  })

  ipcMain.handle(IPC_CHANNELS.FILES_CHECK_EXECUTABLE, (_event, filePath: string): boolean => {
    try {
      fs.accessSync(filePath, fs.constants.X_OK)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle(IPC_CHANNELS.FILES_SEARCH, async (_event, rootDir: string, query: string, options: { caseSensitive?: boolean; regex?: boolean; glob?: string } = {}): Promise<{
    results: Array<{ filePath: string; matches: Array<{ lineNumber: number; lineText: string }> }>
    error?: string
    usedRipgrep: boolean
  }> => {
    if (!query.trim() || !rootDir) return { results: [], usedRipgrep: false }

    // Try ripgrep first for speed
    const tryRipgrep = (): Promise<string | null> => new Promise((resolve) => {
      const args = ['--json', '--max-count', '50', '--max-filesize', '1M']
      if (!options.caseSensitive) args.push('--ignore-case')
      if (!options.regex) args.push('--fixed-strings')
      if (options.glob) args.push('--glob', options.glob)
      args.push('--', query, rootDir)

      execFile('rg', args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
        // rg exits 1 when no matches — that's fine
        if (err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
          resolve(null) // rg not found
        } else {
          resolve(stdout)
        }
      })
    })

    const rgOutput = await tryRipgrep()

    if (rgOutput !== null) {
      // Parse ripgrep JSON output
      const fileMap = new Map<string, Array<{ lineNumber: number; lineText: string }>>()
      for (const line of rgOutput.split('\n')) {
        if (!line.trim()) continue
        try {
          const obj = JSON.parse(line) as { type: string; data: { path?: { text: string }; line_number?: number; lines?: { text: string } } }
          if (obj.type === 'match' && obj.data.path?.text && obj.data.line_number && obj.data.lines?.text) {
            const fp = obj.data.path.text
            if (!fileMap.has(fp)) fileMap.set(fp, [])
            fileMap.get(fp)!.push({
              lineNumber: obj.data.line_number,
              lineText: obj.data.lines.text.replace(/\r?\n$/, '')
            })
          }
        } catch { /* skip malformed lines */ }
      }
      return {
        results: [...fileMap.entries()].map(([filePath, matches]) => ({ filePath, matches })),
        usedRipgrep: true
      }
    }

    // Fallback: Node.js recursive search
    const SKIP_DIRS = new Set(['.git', 'node_modules', '.venv', 'venv', '__pycache__', 'dist', 'build', '.next', 'out', 'coverage'])
    const MAX_FILES = 2000
    const MAX_FILE_BYTES = 512 * 1024
    const results: Array<{ filePath: string; matches: Array<{ lineNumber: number; lineText: string }> }> = []
    const queryStr = options.caseSensitive ? query : query.toLowerCase()
    let fileCount = 0

    const walkDir = (dir: string): void => {
      if (fileCount >= MAX_FILES) return
      let entries: fs.Dirent[]
      try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
      for (const entry of entries) {
        if (fileCount >= MAX_FILES) return
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) walkDir(`${dir}/${entry.name}`)
        } else if (entry.isFile()) {
          fileCount++
          const fp = `${dir}/${entry.name}`
          try {
            const stat = fs.statSync(fp)
            if (stat.size > MAX_FILE_BYTES) continue
            const content = fs.readFileSync(fp, 'utf8')
            const lines = content.split('\n')
            const matches: Array<{ lineNumber: number; lineText: string }> = []
            for (let i = 0; i < lines.length; i++) {
              const line = options.caseSensitive ? lines[i] : lines[i].toLowerCase()
              if (line.includes(queryStr)) {
                matches.push({ lineNumber: i + 1, lineText: lines[i].replace(/\r$/, '') })
                if (matches.length >= 50) break
              }
            }
            if (matches.length > 0) results.push({ filePath: fp, matches })
          } catch { /* skip unreadable files */ }
        }
      }
    }

    try {
      walkDir(rootDir)
      return { results, usedRipgrep: false }
    } catch (err) {
      return { results: [], error: String(err), usedRipgrep: false }
    }
  })

  // Script handlers
  ipcMain.handle(IPC_CHANNELS.SCRIPTS_GET_ALL, async () => {
    return getAllScripts()
  })

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_GET_BY_PROJECT, async (_event, projectId: string | null) => {
    return getScriptsByProject(projectId)
  })

  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_CREATE,
    async (_event, name: string, projectId: string | null, description?: string) => {
      return createScript(name, projectId, description)
    }
  )

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_UPDATE, async (_event, id: string, updates: object) => {
    return updateScript(id, updates)
  })

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_DELETE, async (_event, id: string) => {
    return deleteScript(id)
  })

  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_ADD_STEP,
    async (
      _event,
      scriptId: string,
      commandString: string,
      commandId: string | null,
      label?: string
    ) => {
      return addStepToScript(scriptId, commandString, commandId, label)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_ADD_APPROVAL_STEP,
    async (_event, scriptId: string, message: string, label?: string) => {
      return addApprovalStepToScript(scriptId, message, label)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_ADD_NOTE_STEP,
    async (_event, scriptId: string, content: string, label?: string) => {
      return addNoteStepToScript(scriptId, content, label)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_REMOVE_STEP,
    async (_event, scriptId: string, stepId: string) => {
      return removeStepFromScript(scriptId, stepId)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_REORDER_STEPS,
    async (_event, scriptId: string, stepIds: string[]) => {
      return reorderScriptSteps(scriptId, stepIds)
    }
  )

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_MARK_RUN, async (_event, scriptId: string) => {
    return markScriptRun(scriptId)
  })

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_DUPLICATE, async (_event, scriptId: string) => {
    return duplicateScript(scriptId)
  })

  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_CLONE_TO_PROJECT,
    async (_event, scriptId: string, projectId: string) => {
      return cloneScriptToProject(scriptId, projectId)
    }
  )

  ipcMain.handle(IPC_CHANNELS.SCRIPTS_EXPORT, async (event, scriptId: string) => {
    const flow = await exportScript(scriptId)
    if (!flow) return false
    const win = BrowserWindow.fromWebContents(event.sender)!
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      defaultPath: `${getTVFlowName(flow).replace(/[^a-zA-Z0-9_-]/g, '_')}.tvflow`,
      filters: [{ name: 'TerminallySKILL Flow', extensions: ['tvflow'] }]
    })
    if (canceled || !filePath) return false
    const { writeFile } = await import('fs/promises')
    await writeFile(filePath, JSON.stringify(flow, null, 2), 'utf-8')
    return true
  })

  ipcMain.handle(
    IPC_CHANNELS.SCRIPTS_IMPORT,
    async (event, projectId: string | null) => {
      const win = BrowserWindow.fromWebContents(event.sender)!
      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        filters: [{ name: 'TerminallySKILL Flow', extensions: ['tvflow'] }],
        properties: ['openFile']
      })
      if (canceled || filePaths.length === 0) return null
      const { readFile } = await import('fs/promises')
      const raw = await readFile(filePaths[0], 'utf-8')
      const data = JSON.parse(raw) as unknown
      if (!isTVFlowFile(data)) {
        throw new Error('Invalid .tvflow file format')
      }
      return importScript(data as TVFlowFile, projectId)
    }
  )

  // Snippet handlers
  ipcMain.handle(IPC_CHANNELS.SNIPPETS_GET_ALL, async () => {
    return getAllSnippets()
  })

  ipcMain.handle(
    IPC_CHANNELS.SNIPPETS_CREATE,
    async (_event, name: string, template: string, projectId: string | null, description?: string) => {
      return createSnippet(name, template, projectId, description)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SNIPPETS_UPDATE,
    async (_event, id: string, updates: Record<string, unknown>) => {
      return updateSnippet(id, updates)
    }
  )

  ipcMain.handle(IPC_CHANNELS.SNIPPETS_DELETE, async (_event, id: string) => {
    return deleteSnippet(id)
  })

  ipcMain.handle(IPC_CHANNELS.SNIPPETS_DUPLICATE, async (_event, id: string) => {
    return duplicateSnippet(id)
  })

  ipcMain.handle(IPC_CHANNELS.SNIPPETS_MARK_RUN, async (_event, id: string) => {
    return markSnippetRun(id)
  })

  // Command detection handlers
  ipcMain.handle(
    IPC_CHANNELS.COMMANDS_SCAN_PATH,
    async (_event, knownExecutables: string[]) => {
      const known = new Set(knownExecutables)
      return detectNewCommands(known)
    }
  )

  ipcMain.handle(IPC_CHANNELS.COMMANDS_PARSE_HELP, async (_event, executable: string) => {
    return parseHelpOutput(executable)
  })

  ipcMain.handle(
    IPC_CHANNELS.COMMANDS_ADD_MANUAL,
    async (_event, executable: string, category?: string) => {
      return addManualCommand(executable, category)
    }
  )

  ipcMain.handle(IPC_CHANNELS.COMMANDS_REMOVE_DISCOVERED, async (_event, executable: string) => {
    return removeDiscoveredCommand(executable)
  })

  ipcMain.handle(IPC_CHANNELS.COMMANDS_RESET_TREES, async () => {
    return resetCommandTrees()
  })

  ipcMain.handle(
    IPC_CHANNELS.COMMANDS_SAVE_DISCOVERED,
    async (_event, commands: DiscoveredCommand[]) => {
      return addDiscoveredCommands(commands)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.COMMANDS_SAVE_ENRICHED,
    async (_event, executable: string, definition: CommandDefinition) => {
      return saveEnrichedCommand(executable, definition)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.COMMANDS_SAVE_ENRICHED_BULK,
    async (_event, executable: string, definitions: CommandDefinition[]) => {
      return saveEnrichedBulk(executable, definitions)
    }
  )

  // PATH fix handlers
  ipcMain.handle(IPC_CHANNELS.COMMANDS_FIND_COMMAND, async (_event, executable: string) => {
    return findCommand(executable)
  })

  ipcMain.handle(IPC_CHANNELS.COMMANDS_SEARCH_INSTALLABLE, async (_event, query: string, limit?: number) => {
    return searchInstallableCommands(query, limit)
  })

  ipcMain.handle(IPC_CHANNELS.COMMANDS_FIX_PATH, async (_event, dir: string) => {
    return addDirToShellPath(dir)
  })

  ipcMain.handle(IPC_CHANNELS.COMMANDS_GET_SHELL_CONFIG, async () => {
    return getShellConfigPath()
  })

  // Terminal log handlers
  ipcMain.handle(IPC_CHANNELS.LOGS_SAVE_SESSION, async (_event, params) => {
    console.log(`[log-save] IPC received: sessionId=${params?.sessionId}, contentLen=${params?.content?.length}`)
    return saveSessionLog(params)
  })

  ipcMain.handle(IPC_CHANNELS.LOGS_GET_INDEX, async (_event, projectId: string | null) => {
    return getLogIndex(projectId)
  })

  ipcMain.handle(IPC_CHANNELS.LOGS_GET_BY_PROJECT, async (_event, projectId: string) => {
    return getLogsByProject(projectId)
  })

  ipcMain.handle(IPC_CHANNELS.LOGS_READ_CONTENT, async (_event, logFilePath: string) => {
    return readLogContent(logFilePath)
  })

  ipcMain.handle(
    IPC_CHANNELS.LOGS_SEARCH,
    async (_event, projectId: string | null, query: string) => {
      return searchLogs(projectId, query)
    }
  )

  ipcMain.handle(IPC_CHANNELS.LOGS_DELETE, async (_event, logFilePath: string) => {
    return deleteLog(logFilePath)
  })

  ipcMain.handle(IPC_CHANNELS.LOGS_GET_BASE_PATH, async (_event, projectId: string | null) => {
    return getLogBasePath(projectId)
  })

  ipcMain.handle(IPC_CHANNELS.RUNS_GET_INDEX, async (_event, projectId: string | null) => {
    return getRunIndex(projectId)
  })

  ipcMain.handle(
    IPC_CHANNELS.RUNS_SEARCH,
    async (_event, projectId: string | null, query: string, statusFilter?: string) => {
      return searchRuns(projectId, query, statusFilter as Parameters<typeof searchRuns>[2])
    }
  )

  ipcMain.handle(IPC_CHANNELS.RUNS_UPSERT, async (_event, run) => {
    return upsertRunRecord(run)
  })

  ipcMain.handle(IPC_CHANNELS.PTY_GET_SESSION_INFO, async (_event, sessionId: string) => {
    return getSessionInfo(sessionId)
  })

  // Settings handlers
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return getSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (_event, updates: object) => {
    return updateSettings(updates)
  })

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_UPDATE_PROVIDER,
    async (_event, providerId: string, updates: Partial<AIProvider>) => {
      return updateProvider(providerId, updates)
    }
  )

  ipcMain.handle(IPC_CHANNELS.SETTINGS_TEST_AI, async (_event, providerId: string) => {
    return testAIConnection(providerId)
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_LIST_AI_MODELS, async (_event, providerId: string) => {
    return listAIModels(providerId)
  })

  ipcMain.handle(IPC_CHANNELS.AI_RUN_ACTION, async (_event, request) => {
    return runAIAction(request)
  })

  // Shell utilities
  ipcMain.handle(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, async (_event, url: string) => {
    // Only allow HTTPS URLs for safety (prevents MITM on HTTP)
    if (url.startsWith('https://')) {
      await shell.openExternal(url)
    }
  })

  // VNC
  ipcMain.handle(
    IPC_CHANNELS.VNC_START,
    async (event, target: SSHProjectWorkspaceTarget, vncPort: number) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) throw new Error('No window found for VNC session')
      return startVncSession(target, vncPort, win)
    }
  )

  ipcMain.on(IPC_CHANNELS.VNC_STOP, (_event, sessionId: string) => {
    stopVncSession(sessionId)
  })

  ipcMain.handle(IPC_CHANNELS.VNC_GET_PASSWORD, (_event, storageKey: string) => {
    return getVncPassword(storageKey)
  })

  ipcMain.handle(IPC_CHANNELS.VNC_SAVE_PASSWORD, (_event, storageKey: string, password: string) => {
    saveVncPassword(storageKey, password)
  })

  ipcMain.handle(IPC_CHANNELS.VNC_DELETE_PASSWORD, (_event, storageKey: string) => {
    deleteVncPassword(storageKey)
  })
}
