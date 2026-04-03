import { create } from 'zustand'
import type { CommandDefinition } from '../../../shared/command-schema'
import { useFileStore } from './file-store'
import { useBuilderStore } from './builder-store'

interface CommandStore {
  commands: CommandDefinition[]
  activeCommand: CommandDefinition | null
  loading: boolean
  scanning: boolean
  parsingHelp: string | null
  setCommands: (commands: CommandDefinition[]) => void
  setActiveCommand: (command: CommandDefinition | null) => void
  setLoading: (loading: boolean) => void
  setScanning: (scanning: boolean) => void
  setParsingHelp: (commandId: string | null) => void
  addCommands: (commands: CommandDefinition[]) => void
  updateCommand: (command: CommandDefinition) => void
  removeCommand: (commandId: string) => void
}

function buildCommandKey(command: CommandDefinition): string {
  if (command.tags?.includes('saved-command')) {
    return `${command.category}::${command.name}`.trim().toLowerCase()
  }

  if (command.subcommands && command.subcommands.length > 0) {
    return `${command.category}::${command.executable} ${command.subcommands.join(' ')}`.trim().toLowerCase()
  }

  return `${command.category}::${command.name}`.trim().toLowerCase()
}

function dedupeCommands(commands: CommandDefinition[]): CommandDefinition[] {
  const byKey = new Map<string, CommandDefinition>()

  for (const command of commands) {
    byKey.set(buildCommandKey(command), command)
  }

  return [...byKey.values()]
}

export const useCommandStore = create<CommandStore>((set) => ({
  commands: [],
  activeCommand: null,
  loading: true,
  scanning: false,
  parsingHelp: null,
  setCommands: (commands) => set({ commands: dedupeCommands(commands), loading: false }),
  setActiveCommand: (command) => {
    if (command) {
      useFileStore.getState().setFileViewerVisible(false)
      useBuilderStore.getState().setValues(command.presetValues ?? {})
    }
    set({ activeCommand: command })
  },
  setLoading: (loading) => set({ loading }),
  setScanning: (scanning) => set({ scanning }),
  setParsingHelp: (commandId) => set({ parsingHelp: commandId }),
  addCommands: (newCommands) =>
    set((state) => ({
      commands: dedupeCommands([...state.commands, ...newCommands])
    })),
  updateCommand: (updated) =>
    set((state) => {
      const nextActiveCommand =
        state.activeCommand?.id === updated.id ? updated : state.activeCommand

      if (nextActiveCommand?.id === updated.id) {
        useBuilderStore.getState().setValues(updated.presetValues ?? {})
      }

      return {
        commands: state.commands.map((c) => (c.id === updated.id ? updated : c)),
        activeCommand: nextActiveCommand
      }
    }),
  removeCommand: (commandId) =>
    set((state) => ({
      commands: state.commands.filter((c) => c.id !== commandId),
      activeCommand: state.activeCommand?.id === commandId ? null : state.activeCommand
    }))
}))
