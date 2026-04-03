export interface BackupLocationSuggestion {
  available: boolean
  path: string | null
  reason?: string
}

export interface BackupRunResult {
  success: boolean
  createdAt?: string
  backupPath?: string
  message?: string
  error?: string
}
