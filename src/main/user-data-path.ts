import { app } from 'electron'
import { join } from 'path'

/** Custom data directory override. When set, data/ and logs/ are read from here instead of the default userData path. */
let customDataDir: string | null = null

export function setCustomDataDir(path: string | null): void {
  customDataDir = path
}

export function getCustomDataDir(): string | null {
  return customDataDir
}

/** The Electron default userData directory — always used for the bootstrap settings.json. */
export function getUserDataDir(): string {
  return app.getPath('userData')
}

/** The active data directory. Redirected if a custom data directory is configured. */
export function getDataDir(): string {
  return join(customDataDir ?? getUserDataDir(), 'data')
}

/** The active logs directory. Redirected if a custom data directory is configured. */
export function getLogsDir(): string {
  return join(customDataDir ?? getUserDataDir(), 'logs')
}
