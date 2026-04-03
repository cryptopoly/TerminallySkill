import { execFile, type ExecFileException } from 'child_process'
import type {
  ProjectWorkspaceTarget,
  WorkspaceTargetConnectionResult
} from '../shared/project-schema'
import { buildWorkspaceTargetTestInvocation } from '../shared/workspace-target'

type ExecFileCallback = (
  error: ExecFileException | null,
  stdout: string,
  stderr: string
) => void

type ExecFileLike = (
  command: string,
  args: readonly string[],
  options: { timeout: number },
  callback: ExecFileCallback
) => void

function formatConnectionError(
  error: ExecFileException | null,
  stdout: string,
  stderr: string
): string {
  const output = stderr.trim() || stdout.trim()

  if (error?.code === 'ENOENT') {
    return 'OpenSSH is not available on PATH.'
  }

  if (error?.killed || /timed out/i.test(error?.message ?? '')) {
    return 'SSH connection timed out.'
  }

  if (/permission denied/i.test(output)) {
    return 'SSH authentication failed. Check your user, key, or agent.'
  }

  if (/could not resolve hostname/i.test(output)) {
    return 'SSH host could not be resolved.'
  }

  if (/host key verification failed/i.test(output)) {
    return 'SSH host key verification failed.'
  }

  return output || error?.message || 'SSH connection test failed.'
}

export async function testWorkspaceTargetConnection(
  workspaceTarget: ProjectWorkspaceTarget,
  runExecFile: ExecFileLike = execFile as ExecFileLike
): Promise<WorkspaceTargetConnectionResult> {
  if (workspaceTarget.type === 'local') {
    return {
      ok: true,
      message: 'Local workspace is ready.'
    }
  }

  const invocation = buildWorkspaceTargetTestInvocation(workspaceTarget)
  if (!invocation) {
    return {
      ok: false,
      message: 'Could not build an SSH connection test.'
    }
  }

  return new Promise((resolve) => {
    runExecFile(invocation.command, invocation.args, { timeout: 8000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          ok: false,
          message: formatConnectionError(error, stdout, stderr)
        })
        return
      }

      const remotePath = stdout.trim() || workspaceTarget.cwd
      resolve({
        ok: true,
        message: remotePath
          ? `SSH connection succeeded. Remote cwd: ${remotePath}`
          : 'SSH connection succeeded.'
      })
    })
  })
}
