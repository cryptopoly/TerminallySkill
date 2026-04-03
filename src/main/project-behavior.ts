import type { RecentCommand } from '../shared/project-schema'

export function toggleFavoriteCommandIds(
  favoriteCommandIds: string[],
  commandId: string
): string[] {
  return favoriteCommandIds.includes(commandId)
    ? favoriteCommandIds.filter((id) => id !== commandId)
    : [...favoriteCommandIds, commandId]
}

export function recordRecentCommand(
  recentCommands: RecentCommand[],
  commandId: string,
  commandString: string,
  timestamp: string,
  limit = 30
): RecentCommand[] {
  return [
    { commandString, commandId, timestamp },
    ...recentCommands.filter((entry) => entry.commandString !== commandString)
  ].slice(0, limit)
}
