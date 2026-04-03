import type { CommandDefinition, CommandOption, PositionalArgument } from '../../../shared/command-schema'

interface AIExplainRequestData {
  commandName: string
  commandString: string
  commandDescription?: string
}

function buildCommandPrefix(command: CommandDefinition): string {
  return [command.executable, ...(command.subcommands ?? [])].filter(Boolean).join(' ').trim()
}

function toPlaceholder(value: string, fallback = 'value'): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return `<${normalized || fallback}>`
}

function buildOptionValueExample(option: CommandOption): string | null {
  switch (option.type) {
    case 'boolean':
      return null
    case 'enum':
      return option.choices?.[0]?.value ?? toPlaceholder(option.label)
    case 'multi-select':
    case 'repeatable':
      return toPlaceholder(option.label)
    case 'number':
      return '<number>'
    case 'file-path':
      return '<file_path>'
    case 'directory-path':
      return '<directory_path>'
    case 'key-value':
      return '<key=value>'
    case 'string':
    default:
      return toPlaceholder(option.label)
  }
}

export function buildOptionExplainRequest(
  command: CommandDefinition,
  option: CommandOption
): AIExplainRequestData {
  const baseCommand = buildCommandPrefix(command)
  const flag = option.long ?? option.short ?? option.label
  const valueExample = buildOptionValueExample(option)
  const commandString = [baseCommand, flag, valueExample].filter(Boolean).join(' ')
  const commandDescription = [command.description, option.description].filter(Boolean).join(' — ')

  return {
    commandName: commandString,
    commandString,
    commandDescription: commandDescription || `${option.label} option for ${baseCommand}`
  }
}

export function buildArgumentExplainRequest(
  command: CommandDefinition,
  arg: PositionalArgument
): AIExplainRequestData {
  const baseCommand = buildCommandPrefix(command)
  const exampleValue =
    arg.type === 'enum' && arg.choices && arg.choices.length > 0
      ? arg.choices[0].value
      : arg.type === 'file-path'
        ? '<file_path>'
        : arg.type === 'directory-path'
          ? '<directory_path>'
          : toPlaceholder(arg.label, 'argument')
  const commandString = [baseCommand, exampleValue].filter(Boolean).join(' ')
  const commandDescription = [command.description, arg.description].filter(Boolean).join(' — ')

  return {
    commandName: `${baseCommand} ${arg.label}`.trim(),
    commandString,
    commandDescription: commandDescription || `${arg.label} argument for ${baseCommand}`
  }
}
