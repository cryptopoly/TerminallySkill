import type { Condition } from '../../../shared/command-schema'

export function evaluateCondition(
  condition: Condition | undefined,
  formState: Record<string, unknown>
): boolean {
  if (!condition) return true

  const value = formState[condition.optionId]
  let result: boolean

  switch (condition.operator) {
    case 'equals':
      result = value === condition.value
      break
    case 'notEquals':
      result = value !== condition.value
      break
    case 'isSet':
      result = value !== undefined && value !== null && value !== '' && value !== false
      break
    case 'isNotSet':
      result = value === undefined || value === null || value === '' || value === false
      break
    case 'greaterThan':
      result = typeof value === 'number' && value > (condition.value as number)
      break
    case 'lessThan':
      result = typeof value === 'number' && value < (condition.value as number)
      break
    case 'contains':
      result = typeof value === 'string' && value.includes(condition.value as string)
      break
    default:
      result = true
  }

  if (condition.and) {
    result = result && condition.and.every((c) => evaluateCondition(c, formState))
  }

  if (condition.or) {
    result = result || condition.or.some((c) => evaluateCondition(c, formState))
  }

  return result
}
