export interface SessionLogMeta {
  /** Unique session identifier (e.g., "term-1") */
  sessionId: string
  /** Project ID this session belonged to (null = no project) */
  projectId: string | null
  /** Project name at time of save */
  projectName: string | null
  /** Absolute path to the .log file */
  logFilePath: string
  /** Shell that was running (e.g., "/bin/zsh") */
  shell: string
  /** Working directory the terminal was opened in */
  cwd: string
  /** When the session was created (ISO 8601) */
  startedAt: string
  /** When the session ended / log was saved (ISO 8601) */
  endedAt: string
  /** PTY exit code (null if manually closed) */
  exitCode: number | null
  /** Number of lines in the log */
  lineCount: number
  /** File size in bytes */
  sizeBytes: number
}

export interface LogSearchResult extends SessionLogMeta {
  /** Matching lines from the log content (capped at 10) */
  matchLines: string[]
}
