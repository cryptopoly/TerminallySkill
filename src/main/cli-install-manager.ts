import type { InstallableCommandMatch } from '../shared/cli-install-catalog'
import {
  normalizeCLIInstallPlatform,
  searchCLIInstallCatalog
} from '../shared/cli-install-catalog'
import { findCommand } from './command-detector'

async function resolveInstalledCandidate(
  executable: string,
  aliases: string[]
): Promise<{ resolvedExecutable: string | null; resolvedPath: string | null }> {
  const candidates = [executable, ...aliases]

  for (const candidate of candidates) {
    const resolvedPath = await findCommand(candidate)
    if (resolvedPath) {
      return {
        resolvedExecutable: candidate,
        resolvedPath
      }
    }
  }

  return {
    resolvedExecutable: null,
    resolvedPath: null
  }
}

export async function searchInstallableCommands(
  query: string,
  limit = 12
): Promise<InstallableCommandMatch[]> {
  const platform = normalizeCLIInstallPlatform(process.platform)
  const catalogEntries = searchCLIInstallCatalog(query, platform, limit)

  const matches = await Promise.all(
    catalogEntries.map(async (entry) => {
      const aliases = entry.aliases ?? []
      const resolved = await resolveInstalledCandidate(entry.executable, aliases)

      return {
        executable: entry.executable,
        title: entry.title,
        description: entry.description,
        aliases,
        tags: entry.tags ?? [],
        popular: entry.popular ?? false,
        installed: Boolean(resolved.resolvedPath),
        resolvedExecutable: resolved.resolvedExecutable,
        resolvedPath: resolved.resolvedPath,
        recipes: entry.install[platform] ?? []
      } satisfies InstallableCommandMatch
    })
  )

  return matches
}
