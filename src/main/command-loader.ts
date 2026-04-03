import { readdir, readFile } from 'fs/promises'
import { join, extname } from 'path'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import {
  loadDiscoveredCommands,
  getAllDiscovered,
  loadEnrichedDefinitions
} from './discovered-command-manager'
import { findCommand } from './command-detector'
import type { CommandDefinition } from '../shared/command-schema'
import { selectPreferredLoadedDefinition } from './command-loader-utils'

function getCommandsDir(): string {
  if (is.dev) {
    return join(app.getAppPath(), 'commands')
  }
  return join(process.resourcesPath, 'commands')
}

async function readJsonFiles(dir: string): Promise<CommandDefinition[]> {
  const commands: CommandDefinition[] = []

  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      const nested = await readJsonFiles(fullPath)
      commands.push(...nested)
    } else if (entry.isFile() && extname(entry.name) === '.json') {
      try {
        const raw = await readFile(fullPath, 'utf-8')
        const def = JSON.parse(raw) as CommandDefinition
        if (def.id && def.name && def.executable) {
          def.source = 'builtin'
          commands.push(def)
        }
      } catch (err) {
        console.error(`Failed to load command definition: ${fullPath}`, err)
      }
    }
  }

  return commands
}

/**
 * Convert a discovered/manual command into a minimal CommandDefinition.
 * Each command gets its own category (its executable name) so it appears
 * as an individual entry in the sidebar rather than lumped into a group.
 */
function toMinimalDefinition(
  executable: string,
  source: 'detected' | 'manual',
  category?: string,
  installed = true
): CommandDefinition {
  return {
    id: `${source}-${executable}`,
    name: executable,
    executable,
    description: 'Click "Generate Command Tree from --help" to populate options',
    category: category || executable,
    source,
    installed,
    enriched: false
  }
}

function buildCommandKey(definition: CommandDefinition): string {
  if (definition.subcommands && definition.subcommands.length > 0) {
    return `${definition.executable} ${definition.subcommands.join(' ')}`.trim().toLowerCase()
  }

  return definition.name.trim().toLowerCase()
}

function isCatalogRoot(definition: CommandDefinition): boolean {
  return definition.tags?.includes('cli-root') === true
}

function isTopLevelCatalogCommand(definition: CommandDefinition): boolean {
  return !definition.subcommands || definition.subcommands.length <= 1
}

function buildRootCatalogDefinition(
  executable: string,
  category: string,
  source: CommandDefinition['source'],
  description: string,
  options?: CommandDefinition['options']
): CommandDefinition {
  return {
    id: `${source || 'builtin'}-${executable}-root`,
    name: executable,
    executable,
    description,
    category,
    source,
    installed: true,
    enriched: true,
    options,
    tags: ['cli-root']
  }
}

function isRootLike(definition: CommandDefinition, executable: string): boolean {
  return !definition.subcommands?.length && definition.name.trim().toLowerCase() === executable
}

function normalizeCatalogDefinitions(
  definitions: CommandDefinition[],
  executable: string,
  installed: boolean
): CommandDefinition[] {
  return definitions.map((definition) => {
    if (!isRootLike(definition, executable)) {
      return { ...definition, installed }
    }

    const tags = new Set(definition.tags ?? [])
    tags.add('cli-root')

    return {
      ...definition,
      installed,
      tags: [...tags]
    }
  })
}

function dedupeCatalogDefinitions(definitions: CommandDefinition[]): CommandDefinition[] {
  const seen = new Set<string>()
  const deduped: CommandDefinition[] = []

  for (const definition of definitions) {
    const key = `${definition.category}::${buildCommandKey(definition)}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(definition)
  }

  return deduped
}

function dedupeAllCommands(definitions: CommandDefinition[]): CommandDefinition[] {
  const indexes = new Map<string, number>()
  const deduped: CommandDefinition[] = []

  for (const definition of definitions) {
    const key = `${definition.category}::${buildCommandKey(definition)}`
    const existingIndex = indexes.get(key)

    if (existingIndex === undefined) {
      indexes.set(key, deduped.length)
      deduped.push(definition)
      continue
    }

    deduped[existingIndex] = selectPreferredLoadedDefinition(
      deduped[existingIndex],
      definition
    )
  }

  return deduped
}

async function loadEnrichedBuiltinDefinitions(
  builtins: CommandDefinition[],
  installedMap: Map<string, boolean>
): Promise<CommandDefinition[]> {
  const executableMeta = new Map<string, { category: string }>()

  for (const builtin of builtins) {
    if (!executableMeta.has(builtin.executable)) {
      executableMeta.set(builtin.executable, {
        category: builtin.category || builtin.executable
      })
    }
  }

  const enriched: CommandDefinition[] = []

  await Promise.all(
    [...executableMeta.entries()].map(async ([executable, meta]) => {
      const enrichedDefs = await loadEnrichedDefinitions(executable)
      if (enrichedDefs.length === 0) return

      const normalizedDefinitions = normalizeCatalogDefinitions(
        enrichedDefs,
        executable,
        installedMap.get(executable) ?? false
      )

      const visibleDefinitions = dedupeCatalogDefinitions(
        normalizedDefinitions.filter(
          (definition) => isCatalogRoot(definition) || isTopLevelCatalogCommand(definition)
        )
      )

      for (const definition of visibleDefinitions) {
        enriched.push({
          ...definition,
          category: definition.category || meta.category,
          source: 'builtin',
          installed: installedMap.get(executable) ?? false,
          enriched: true
        })
      }
    })
  )

  return enriched
}

async function resolveInstalledMap(executables: string[]): Promise<Map<string, boolean>> {
  const uniqueExecutables = [...new Set(executables)]
  const results: Array<readonly [string, boolean]> = []

  // Process in batches to avoid flooding the event loop with hundreds of
  // parallel fs operations, which can starve the OS message pump and trigger
  // "app not responding" dialogs on slower machines / VMs.
  const BATCH_SIZE = 8
  for (let i = 0; i < uniqueExecutables.length; i += BATCH_SIZE) {
    const batch = uniqueExecutables.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(async (executable) => [executable, (await findCommand(executable)) !== null] as const)
    )
    results.push(...batchResults)
  }

  return new Map(results)
}

async function loadExpandedBuiltinCommands(
  builtins: CommandDefinition[],
  installedMap: Map<string, boolean>
): Promise<CommandDefinition[]> {
  const existingKeys = new Set(builtins.map((definition) => buildCommandKey(definition)))
  const executableMeta = new Map<string, { category: string; description: string }>()

  const builtinsByExecutable = new Map<string, CommandDefinition[]>()
  for (const builtin of builtins) {
    const definitions = builtinsByExecutable.get(builtin.executable) ?? []
    definitions.push(builtin)
    builtinsByExecutable.set(builtin.executable, definitions)
  }

  for (const [executable, definitions] of builtinsByExecutable.entries()) {
    const representsCliFamily = definitions.some(
      (definition) =>
        definition.name.trim().toLowerCase().startsWith(`${executable} `) ||
        (definition.subcommands?.length ?? 0) > 0
    )

    if (!representsCliFamily) continue

    executableMeta.set(executable, {
      category: definitions[0].category || executable,
      description: `${executable} command-line tool`
    })
  }

  const expanded: CommandDefinition[] = []

  await Promise.all(
    [...executableMeta.entries()].map(async ([executable, meta]) => {
      let enrichedDefs = await loadEnrichedDefinitions(executable)
      const isInstalled = installedMap.get(executable) ?? false
      const fallbackRootDefinition = buildRootCatalogDefinition(
        executable,
        meta.category,
        'builtin',
        meta.description
      )

      if (enrichedDefs.length === 0) {
        enrichedDefs = [{ ...fallbackRootDefinition, installed: isInstalled }]
      }

      enrichedDefs = normalizeCatalogDefinitions(enrichedDefs, executable, isInstalled)

      const visibleDefinitions = dedupeCatalogDefinitions(
        enrichedDefs.filter(
          (definition) => isCatalogRoot(definition) || isTopLevelCatalogCommand(definition)
        )
      )

      const rootAlreadyExists = builtins.some(
        (definition) =>
          definition.executable === executable &&
          isRootLike(definition, executable)
      )

      if (!rootAlreadyExists && !visibleDefinitions.some((definition) => isCatalogRoot(definition))) {
        visibleDefinitions.unshift(
          fallbackRootDefinition
        )
      }

      for (const definition of visibleDefinitions) {
        const nextKey = buildCommandKey(definition)
        if (existingKeys.has(nextKey)) continue

        existingKeys.add(nextKey)
        expanded.push({
          ...definition,
          category: definition.category || meta.category,
          source: 'builtin',
          installed: isInstalled,
          enriched: true
        })
      }
    })
  )

  return expanded
}

export async function loadAllCommands(): Promise<CommandDefinition[]> {
  // Load builtin JSON commands
  const dir = getCommandsDir()
  let builtins: CommandDefinition[] = []
  try {
    builtins = await readJsonFiles(dir)
  } catch (err) {
    console.error('Failed to load commands directory:', err)
  }

  // Load discovered/manual commands
  await loadDiscoveredCommands()
  const discovered = getAllDiscovered()
  const installedMap = await resolveInstalledMap([
    ...builtins.map((command) => command.executable),
    ...discovered.map((command) => command.executable)
  ])

  builtins = builtins.map((definition) => ({
    ...definition,
    installed: installedMap.get(definition.executable) ?? false
  }))

  const enrichedBuiltinDefinitions = await loadEnrichedBuiltinDefinitions(builtins, installedMap)

  const allCommands: CommandDefinition[] = [...enrichedBuiltinDefinitions]

  for (const cmd of discovered) {
    // If this command has been enriched, load all definitions (parent + subcommands)
    if (cmd.enriched) {
      const enrichedDefs = await loadEnrichedDefinitions(cmd.executable)
      if (enrichedDefs.length > 0) {
        const normalizedDefinitions = normalizeCatalogDefinitions(
          enrichedDefs,
          cmd.executable,
          installedMap.get(cmd.executable) ?? false
        )
        const visibleDefinitions = dedupeCatalogDefinitions(
          normalizedDefinitions.filter(
            (definition) => isCatalogRoot(definition) || isTopLevelCatalogCommand(definition)
          )
        )

        const rootExists = visibleDefinitions.some((definition) => isCatalogRoot(definition))
        if (!rootExists) {
          visibleDefinitions.unshift({
            ...toMinimalDefinition(
              cmd.executable,
              cmd.source,
              cmd.category,
              installedMap.get(cmd.executable) ?? false
            ),
            id: `${cmd.source}-${cmd.executable}-root`,
            tags: ['cli-root'],
            enriched: true
          })
        }

        for (const def of visibleDefinitions) {
          def.source = cmd.source
          def.installed = installedMap.get(cmd.executable) ?? false
          def.enriched = true
          allCommands.push(def)
        }
        continue
      }
    }

    // Otherwise create a minimal definition
    allCommands.push(
      toMinimalDefinition(
        cmd.executable,
        cmd.source,
        cmd.category,
        installedMap.get(cmd.executable) ?? false
      )
    )
  }

  return dedupeAllCommands(allCommands)
}
