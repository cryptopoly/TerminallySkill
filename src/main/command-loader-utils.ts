import type { CommandDefinition } from '../shared/command-schema'

function isCatalogRoot(definition: CommandDefinition): boolean {
  return definition.tags?.includes('cli-root') === true
}

function isRootLike(definition: CommandDefinition, executable: string): boolean {
  return !definition.subcommands?.length && definition.name.trim().toLowerCase() === executable
}

function getDefinitionRichness(definition: CommandDefinition): number {
  return (
    (definition.options?.length ?? 0) * 8 +
    (definition.positionalArgs?.length ?? 0) * 8 +
    (definition.examples?.length ?? 0) * 4 +
    (definition.subcommands?.length ?? 0) * 3 +
    (definition.exclusiveGroups?.length ?? 0) * 2 +
    (definition.referenceHelp ? 2 : 0) +
    (definition.enriched ? 1 : 0)
  )
}

export function selectPreferredLoadedDefinition(
  current: CommandDefinition,
  candidate: CommandDefinition
): CommandDefinition {
  const currentRichness = getDefinitionRichness(current)
  const candidateRichness = getDefinitionRichness(candidate)

  if (candidateRichness !== currentRichness) {
    return candidateRichness > currentRichness ? candidate : current
  }

  const currentIsRoot = isCatalogRoot(current) || isRootLike(current, current.executable)
  const candidateIsRoot = isCatalogRoot(candidate) || isRootLike(candidate, candidate.executable)
  if (currentIsRoot !== candidateIsRoot) {
    return candidateIsRoot ? candidate : current
  }

  return candidate
}
