import { safeStorage } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { getUserDataDir } from './user-data-path'

const CREDS_FILE = 'vnc-credentials.json'

function getCredsPath(): string {
  return path.join(getUserDataDir(), CREDS_FILE)
}

function loadStore(): Record<string, string> {
  try {
    const raw = fs.readFileSync(getCredsPath(), 'utf-8')
    return JSON.parse(raw) as Record<string, string>
  } catch {
    return {}
  }
}

function saveStore(store: Record<string, string>): void {
  const filePath = getCredsPath()
  fs.writeFileSync(filePath, JSON.stringify(store), { encoding: 'utf-8', mode: 0o600 })
}

export function getVncPassword(storageKey: string): string | null {
  if (!safeStorage.isEncryptionAvailable()) return null
  const store = loadStore()
  const encrypted = store[storageKey]
  if (!encrypted) return null
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  } catch {
    return null
  }
}

export function saveVncPassword(storageKey: string, password: string): void {
  if (!safeStorage.isEncryptionAvailable()) return
  const store = loadStore()
  store[storageKey] = safeStorage.encryptString(password).toString('base64')
  saveStore(store)
}

export function deleteVncPassword(storageKey: string): void {
  const store = loadStore()
  delete store[storageKey]
  saveStore(store)
}
