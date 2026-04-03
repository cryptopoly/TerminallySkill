import { describe, expect, it } from 'vitest'
import { createLocalWorkspaceTarget, createSSHWorkspaceTarget } from './project-schema'
import {
  buildInteractiveWorkspaceConnectCommand,
  buildProjectWorkspaceCommandString,
  buildWorkspaceTargetTestInvocation,
  buildWorkspaceCommandString,
  buildWorkspaceTerminalLaunchPlan
} from './workspace-target'

describe('workspace-target', () => {
  it('keeps local workspace commands unchanged', () => {
    expect(
      buildWorkspaceCommandString(createLocalWorkspaceTarget('/repo'), 'npm test', {
        NODE_ENV: 'test'
      })
    ).toBe('npm test')
  })

  it('wraps ssh workspace commands with destination, cwd, and env exports', () => {
    expect(
      buildWorkspaceCommandString(
        createSSHWorkspaceTarget('prod.example.com', 'deploy', '/srv/app', 2222, '~/.ssh/deploy_ed25519'),
        'npm test',
        { NODE_ENV: 'production' }
      )
    ).toBe(
      "'ssh' '-p' '2222' '-i' '~/.ssh/deploy_ed25519' 'deploy@prod.example.com' 'export NODE_ENV='\\''production'\\'' && cd '\\''/srv/app'\\'' && npm test'"
    )
  })

  it('builds target-aware launch plans for local and ssh workspaces', () => {
    expect(
      buildWorkspaceTerminalLaunchPlan(
        {
          workingDirectory: '/repo',
          workspaceTarget: createLocalWorkspaceTarget('/repo')
        },
        { NODE_ENV: 'test' }
      )
    ).toEqual({
      cwd: '/repo',
      projectWorkingDirectory: '/repo',
      envOverrides: { NODE_ENV: 'test' }
    })

    expect(
      buildWorkspaceTerminalLaunchPlan(
        {
          workingDirectory: '/srv/app',
          workspaceTarget: createSSHWorkspaceTarget(
            'prod.example.com',
            'deploy',
            '/srv/app',
            2222,
            '~/.ssh/deploy_ed25519'
          )
        },
        { NODE_ENV: 'production' }
      )
    ).toEqual({
      cwd: undefined,
      projectWorkingDirectory: '/srv/app',
      envOverrides: undefined
    })
  })

  it('can wrap commands directly from a project-like shape', () => {
    expect(
      buildProjectWorkspaceCommandString(
        {
          workspaceTarget: createSSHWorkspaceTarget('prod.example.com', '', '/srv/app')
        },
        'bin/deploy'
      )
    ).toBe("'ssh' 'prod.example.com' 'cd '\\''/srv/app'\\'' && bin/deploy'")
  })

  it('builds an interactive ssh connect command for remote workspaces', () => {
    expect(
      buildInteractiveWorkspaceConnectCommand(
        createSSHWorkspaceTarget(
          'prod.example.com',
          'deploy',
          '/srv/app',
          2222,
          '~/.ssh/deploy_ed25519'
        )
      )
    ).toBe(
      "'ssh' '-t' '-p' '2222' '-i' '~/.ssh/deploy_ed25519' 'deploy@prod.example.com' 'cd '\\''/srv/app'\\'' && exec \"${SHELL:-/bin/sh}\" -l'"
    )

    expect(buildInteractiveWorkspaceConnectCommand(createLocalWorkspaceTarget('/repo'))).toBeNull()
  })

  it('builds an ssh test invocation that checks the remote cwd', () => {
    expect(
      buildWorkspaceTargetTestInvocation(
        createSSHWorkspaceTarget(
          'prod.example.com',
          'deploy',
          '/srv/app',
          2222,
          '~/.ssh/deploy_ed25519'
        )
      )
    ).toEqual({
      command: 'ssh',
      args: [
        '-p',
        '2222',
        '-i',
        '~/.ssh/deploy_ed25519',
        '-o',
        'BatchMode=yes',
        '-o',
        'ConnectTimeout=5',
        '-o',
        'NumberOfPasswordPrompts=0',
        'deploy@prod.example.com',
        "sh -lc 'cd '\\''/srv/app'\\'' && pwd'"
      ]
    })
  })
})
