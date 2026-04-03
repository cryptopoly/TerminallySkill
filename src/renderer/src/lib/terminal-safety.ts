export interface TerminalPasteAssessment {
  needsConfirmation: boolean
  reasons: string[]
  lineCount: number
  preview: string
}

export function getBracketedPasteModeChange(output: string): boolean | null {
  let nextMode: boolean | null = null

  if (output.includes('\x1b[?2004h')) {
    nextMode = true
  }

  if (output.includes('\x1b[?2004l')) {
    nextMode = false
  }

  return nextMode
}

export function wrapBracketedPaste(text: string): string {
  return `\x1b[200~${text}\x1b[201~`
}

const SENSITIVE_PROMPT_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\[sudo\]\s+password\s+for\b.*:\s*$/i, label: 'Sudo password prompt' },
  { re: /password(?:\s+for\b.*)?:\s*$/i, label: 'Password prompt' },
  { re: /passphrase(?:\s+for\b.*)?:\s*$/i, label: 'Passphrase prompt' },
  { re: /enter\s+pin\b.*:\s*$/i, label: 'PIN prompt' },
  { re: /verification\s+code\b.*:\s*$/i, label: 'Verification code prompt' },
  { re: /token\b.*:\s*$/i, label: 'Token prompt' },
  { re: /api\s+key\b.*:\s*$/i, label: 'API key prompt' }
]

const SUSPICIOUS_PASTE_PATTERNS = [
  /\b(?:curl|wget)\b[^\n|]*\|\s*(?:sh|bash|zsh)\b/i,
  /\brm\s+-rf\b/i,
  /\bsudo\b/i
]

export function detectSensitivePromptLabel(outputTail: string): string | null {
  const normalized = outputTail.replace(/\r/g, '')
  const lines = normalized.split('\n')
  const lastLine = lines[lines.length - 1]?.trimStart() ?? normalized.trimStart()

  for (const pattern of SENSITIVE_PROMPT_PATTERNS) {
    if (pattern.re.test(lastLine)) {
      return pattern.label
    }
  }

  return null
}

export function assessTerminalPaste(text: string): TerminalPasteAssessment {
  const normalized = text.replace(/\r/g, '')
  const preview = normalized.length > 280 ? `${normalized.slice(0, 280)}...` : normalized
  const lineCount = normalized.length === 0 ? 0 : normalized.split('\n').length
  const reasons: string[] = []

  if (lineCount > 1) {
    reasons.push(`multi-line paste (${lineCount} lines)`)
  }

  if (normalized.length >= 80) {
    reasons.push('large pasted payload')
  }

  // Check for control characters but exclude \r (\x0d) and \n (\x0a) which
  // are normal line-ending characters, not dangerous control sequences.
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text)) {
    reasons.push('control characters detected')
  }

  if (SUSPICIOUS_PASTE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    reasons.push('potentially dangerous shell command')
  }

  return {
    needsConfirmation: reasons.length > 0,
    reasons,
    lineCount,
    preview
  }
}
