export interface AppUpdateAsset {
  platform?: string
  arch?: string
  url: string
  label?: string
  fileName?: string
}

export interface AppUpdateManifest {
  version: string
  notes?: string | string[]
  publishedAt?: string
  url?: string
  fileName?: string
  label?: string
  downloads?: AppUpdateAsset[]
  assets?: AppUpdateAsset[]
  platforms?: Record<string, string | (Partial<AppUpdateAsset> & { url: string })>
}

export interface AppUpdateCheckResult {
  status: 'not-configured' | 'up-to-date' | 'update-available' | 'error'
  delivery?: 'custom' | 'electron-updater'
  currentVersion: string
  checkedAt: string
  feedUrl: string | null
  latestVersion?: string
  notes?: string
  publishedAt?: string
  downloadUrl?: string
  assetLabel?: string
  fileName?: string
  message: string
}

export interface AppUpdateInstallResult {
  success: boolean
  delivery?: 'custom' | 'electron-updater'
  message: string
  filePath?: string
}
