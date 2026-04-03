import type { AppUpdateAsset } from '../shared/update-schema'

export function compareVersions(left: string, right: string): number {
  const toSegments = (value: string): number[] => {
    const core = value.trim().split('-')[0] ?? value.trim()
    return core
      .split('.')
      .map((segment) => Number.parseInt(segment, 10))
      .filter((segment) => Number.isFinite(segment))
  }

  const leftSegments = toSegments(left)
  const rightSegments = toSegments(right)
  const length = Math.max(leftSegments.length, rightSegments.length, 3)

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftSegments[index] ?? 0
    const rightValue = rightSegments[index] ?? 0
    if (leftValue === rightValue) continue
    return leftValue > rightValue ? 1 : -1
  }

  return 0
}

export function resolveUpdateManifestUrl(feedUrl: string): string {
  return resolveUpdateManifestUrls(feedUrl)[0] ?? ''
}

export function resolveUpdateManifestUrls(
  feedUrl: string,
  platform: NodeJS.Platform = process.platform,
  arch: NodeJS.Architecture = process.arch
): string[] {
  const trimmed = feedUrl.trim()
  if (!trimmed) return []
  if (/\.(json|ya?ml)($|[?#])/i.test(trimmed)) return [trimmed]

  const baseUrl = trimmed.replace(/\/+$/, '')
  const candidates = [`${baseUrl}/latest.json`]

  const appendCandidate = (fileName: string): void => {
    candidates.push(`${baseUrl}/${fileName}`)
  }

  if (platform === 'darwin') {
    if (arch === 'arm64') {
      appendCandidate('latest-mac-arm64.yml')
      appendCandidate('latest-mac-arm64.yaml')
    } else if (arch === 'x64') {
      appendCandidate('latest-mac-x64.yml')
      appendCandidate('latest-mac-x64.yaml')
    }
    appendCandidate('latest-mac.yml')
    appendCandidate('latest-mac.yaml')
  } else if (platform === 'linux') {
    if (arch === 'arm64') {
      appendCandidate('latest-linux-arm64.yml')
      appendCandidate('latest-linux-arm64.yaml')
      appendCandidate('latest-linux-aarch64.yml')
      appendCandidate('latest-linux-aarch64.yaml')
    } else if (arch === 'x64') {
      appendCandidate('latest-linux.yml')
      appendCandidate('latest-linux.yaml')
      appendCandidate('latest-linux-x64.yml')
      appendCandidate('latest-linux-x64.yaml')
      appendCandidate('latest-linux-amd64.yml')
      appendCandidate('latest-linux-amd64.yaml')
    }

    appendCandidate('latest-linux.yml')
    appendCandidate('latest-linux.yaml')
  } else if (platform === 'win32') {
    if (arch === 'arm64') {
      appendCandidate('latest-win-arm64.yml')
      appendCandidate('latest-win-arm64.yaml')
    } else if (arch === 'x64') {
      appendCandidate('latest-win-x64.yml')
      appendCandidate('latest-win-x64.yaml')
    }
    appendCandidate('latest.yml')
    appendCandidate('latest.yaml')
    appendCandidate('latest-win.yml')
    appendCandidate('latest-win.yaml')
    appendCandidate('latest-win32.yml')
    appendCandidate('latest-win32.yaml')
  }

  return [...new Set(candidates)]
}

export function pickBestUpdateAsset(
  assets: AppUpdateAsset[],
  platform: NodeJS.Platform = process.platform,
  arch: NodeJS.Architecture = process.arch
): AppUpdateAsset | null {
  const scored = assets
    .map((asset) => {
      const assetPlatform = (asset.platform ?? 'any').toLowerCase()
      const assetArch = asset.arch?.toLowerCase()

      if (assetPlatform !== 'any' && assetPlatform !== platform) {
        return null
      }

      let score = 0

      if (assetPlatform === platform) score += 40
      if (assetPlatform === 'any') score += 10

      if (!assetArch) {
        score += 5
      } else if (assetArch === arch) {
        score += 30
      } else if (platform === 'darwin' && assetArch === 'universal') {
        score += 25
      } else if (assetArch === 'universal') {
        score += 12
      } else {
        return null
      }

      return { asset, score }
    })
    .filter((entry): entry is { asset: AppUpdateAsset; score: number } => Boolean(entry))
    .sort((left, right) => right.score - left.score)

  return scored[0]?.asset ?? null
}

function scoreInstallerFormat(
  asset: AppUpdateAsset,
  platform: NodeJS.Platform
): number {
  const fileName = (asset.fileName ?? asset.url).toLowerCase()

  if (platform === 'darwin') {
    if (fileName.endsWith('.dmg')) return 30
    if (fileName.endsWith('.pkg')) return 24
    if (fileName.endsWith('.zip')) return 16
  }

  if (platform === 'win32') {
    if (fileName.endsWith('.exe')) return 30
    if (fileName.endsWith('.msi')) return 24
    if (fileName.endsWith('.zip')) return 12
  }

  if (platform === 'linux') {
    if (fileName.endsWith('.deb')) return 30
    if (fileName.endsWith('.appimage')) return 24
    if (fileName.endsWith('.rpm')) return 22
    if (fileName.endsWith('.tar.gz')) return 16
    if (fileName.endsWith('.zip')) return 10
  }

  return 0
}

export function pickBestInstallerAsset(
  assets: AppUpdateAsset[],
  platform: NodeJS.Platform = process.platform,
  arch: NodeJS.Architecture = process.arch
): AppUpdateAsset | null {
  const matched = assets
    .map((asset) => {
      const bestMatch = pickBestUpdateAsset([asset], platform, arch)
      if (!bestMatch) return null
      return {
        asset,
        score: scoreInstallerFormat(asset, platform)
      }
    })
    .filter((entry): entry is { asset: AppUpdateAsset; score: number } => Boolean(entry))
    .sort((left, right) => right.score - left.score)

  return matched[0]?.asset ?? pickBestUpdateAsset(assets, platform, arch)
}
