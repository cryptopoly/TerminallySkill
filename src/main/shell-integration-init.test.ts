import { describe, expect, it } from 'vitest'
import { buildBashShellIntegrationInit, buildZshShellIntegrationInit } from './shell-integration-init'

describe('shell integration init scripts', () => {
  it('builds zsh hooks for prompt-ready and command-start events', () => {
    const init = buildZshShellIntegrationInit()

    expect(init).toContain('precmd_functions+=(__tv_prompt_ready)')
    expect(init).toContain('preexec_functions+=(__tv_command_start)')
  })

  it('builds bash hooks that emit prompt-ready and command-start markers', () => {
    const init = buildBashShellIntegrationInit()

    expect(init).toContain('__tv_command_start "$BASH_COMMAND"')
    expect(init).toContain("trap '__tv_preexec' DEBUG")
    expect(init).toContain('PROMPT_COMMAND="__tv_prompt_command"')
    expect(init).toContain('__tv_command_started=0')
    expect(init).toContain('__tv_prompt_state=1')
    expect(init).toContain('__tv_run_original_prompt_command()')
    expect(init).toContain('__tv_original_prompt_command_array=("${PROMPT_COMMAND[@]}")')
  })
})
