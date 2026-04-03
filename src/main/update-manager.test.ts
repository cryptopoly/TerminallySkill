import { describe, expect, it } from 'vitest'
import {
  compareVersions,
  pickBestInstallerAsset,
  pickBestUpdateAsset,
  resolveUpdateManifestUrl,
  resolveUpdateManifestUrls
} from './update-utils'

function buildPrettyNameCandidate(downloadUrl: string): string {
  const parsed = new URL(downloadUrl)
  const parts = decodeURIComponent(parsed.pathname).split('/')
  const fileName = parts.pop() ?? ''
  const versionMatch = fileName.match(/^(.*?)-(\d+\.\d+\.\d+.*)$/)
  if (!versionMatch) return downloadUrl
  const compactPrefix = versionMatch[1].replace(/[-\s]+/g, '')
  parsed.pathname = [...parts, `${compactPrefix}-${versionMatch[2]}`].join('/')
  return parsed.toString()
}

describe('update-manager helpers', () => {
  it('compares semver-ish versions', () => {
    expect(compareVersions('0.2.1', '0.2.0')).toBe(1)
    expect(compareVersions('0.2', '0.2.0')).toBe(0)
    expect(compareVersions('0.2.0', '0.2.1')).toBe(-1)
    expect(compareVersions('1.0.0-beta.1', '1.0.0')).toBe(0)
  })

  it('resolves base feed URLs to latest.json', () => {
    expect(resolveUpdateManifestUrl('http://localhost:9090')).toBe('http://localhost:9090/latest.json')
    expect(resolveUpdateManifestUrl('http://localhost:9090/')).toBe('http://localhost:9090/latest.json')
    expect(resolveUpdateManifestUrl('https://example.com/releases/latest.json')).toBe(
      'https://example.com/releases/latest.json'
    )
  })

  it('includes electron-builder YAML feeds as fallbacks for base URLs', () => {
    expect(resolveUpdateManifestUrls('http://localhost:9090', 'darwin', 'arm64')).toEqual([
      'http://localhost:9090/latest.json',
      'http://localhost:9090/latest-mac-arm64.yml',
      'http://localhost:9090/latest-mac-arm64.yaml',
      'http://localhost:9090/latest-mac.yml',
      'http://localhost:9090/latest-mac.yaml'
    ])
  })

  it('can derive a compact artifact URL when the feed uses slugged names', () => {
    expect(buildPrettyNameCandidate('http://localhost:9090/Terminally-SKILL-0.3.6-arm64-mac.zip')).toBe(
      'http://localhost:9090/TerminallySKILL-0.3.6-arm64-mac.zip'
    )
  })

  it('prefers exact platform/arch matches over generic assets', () => {
    const asset = pickBestUpdateAsset(
      [
        { platform: 'any', url: 'https://example.com/generic.zip' },
        { platform: 'darwin', arch: 'universal', url: 'https://example.com/mac-universal.dmg' },
        { platform: 'darwin', arch: 'arm64', url: 'https://example.com/TerminallySKILL-0.3.6-arm64.dmg' }
      ],
      'darwin',
      'arm64'
    )

    expect(asset?.url).toBe('https://example.com/TerminallySKILL-0.3.6-arm64.dmg')
  })

  it('falls back to universal mac assets when exact arch is unavailable', () => {
    const asset = pickBestUpdateAsset(
      [
        { platform: 'darwin', arch: 'universal', url: 'https://example.com/mac-universal.dmg' },
        { platform: 'any', url: 'https://example.com/generic.zip' }
      ],
      'darwin',
      'arm64'
    )

    expect(asset?.url).toBe('https://example.com/mac-universal.dmg')
  })

  it('prefers installer-friendly assets for the custom updater path', () => {
    const asset = pickBestInstallerAsset(
      [
        { platform: 'darwin', url: 'https://example.com/TerminallySKILL-0.3.6-arm64-mac.zip' },
        { platform: 'darwin', url: 'https://example.com/TerminallySKILL-0.3.6-arm64.dmg' }
      ],
      'darwin',
      'arm64'
    )

    expect(asset?.url).toBe('https://example.com/TerminallySKILL-0.3.6-arm64.dmg')
  })
})
