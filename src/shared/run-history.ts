import type { RunRecord, RunStatus, RunStepRecord } from './run-schema'

export type RunStatusFilter = 'all' | 'completed' | 'failed' | 'cancelled' | 'running'

export interface RunComparisonRow {
  key: string
  index: number
  baseline: RunStepRecord | null
  candidate: RunStepRecord | null
  changed: boolean
  changeKind: 'unchanged' | 'added' | 'removed' | 'type-changed' | 'status-changed' | 'content-changed'
}

export interface RunComparisonSummary {
  changedSteps: number
  addedSteps: number
  removedSteps: number
  regressions: number
  fixes: number
  baselineDurationMs: number | null
  candidateDurationMs: number | null
  durationDeltaMs: number | null
}

function normalizeRunStatus(status: RunStatus): Exclude<RunStatusFilter, 'all'> {
  switch (status) {
    case 'completed':
      return 'completed'
    case 'failed':
      return 'failed'
    case 'cancelled':
      return 'cancelled'
    default:
      return 'running'
  }
}

function buildRunSearchText(run: RunRecord): string {
  return [
    run.scriptName,
    run.sessionId,
    run.projectName ?? '',
    run.status,
    run.error ?? '',
    run.cwd ?? '',
    ...run.steps.flatMap((step) =>
      step.type === 'command'
        ? [step.label, step.commandString, String(step.exitCode ?? ''), step.status]
        : step.type === 'approval'
          ? [step.label, step.message, step.status]
          : [step.label, step.content, step.status]
    )
  ]
    .join('\n')
    .toLowerCase()
}

export function filterRuns(
  runs: RunRecord[],
  query: string,
  statusFilter: RunStatusFilter = 'all'
): RunRecord[] {
  const needle = query.trim().toLowerCase()

  return runs.filter((run) => {
    if (statusFilter !== 'all' && normalizeRunStatus(run.status) !== statusFilter) {
      return false
    }

    if (!needle) {
      return true
    }

    return buildRunSearchText(run).includes(needle)
  })
}

export function findPreviousComparableRun(runs: RunRecord[], run: RunRecord): RunRecord | null {
  const related = runs
    .filter((entry) => entry.scriptId === run.scriptId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))

  const currentIndex = related.findIndex((entry) => entry.runId === run.runId)
  if (currentIndex < 0) return related[0] ?? null
  return related[currentIndex + 1] ?? null
}

function getStepComparableContent(step: RunStepRecord): string {
  switch (step.type) {
    case 'command':
      return `${step.label}\n${step.commandString}\n${step.attempts}\n${step.exitCode ?? ''}`
    case 'approval':
      return `${step.label}\n${step.message}\n${step.requireConfirmation ? 'manual' : 'auto'}`
    case 'note':
      return `${step.label}\n${step.content}`
  }
}

function getDurationMs(startedAt: string | null, endedAt: string | null): number | null {
  if (!startedAt || !endedAt) return null
  return new Date(endedAt).getTime() - new Date(startedAt).getTime()
}

function isStepRegression(step: RunStepRecord | null): boolean {
  return Boolean(step && step.status === 'failed')
}

function isStepFixed(baseline: RunStepRecord | null, candidate: RunStepRecord | null): boolean {
  return Boolean(baseline && baseline.status === 'failed' && candidate && candidate.status === 'completed')
}

export function getRunComparisonChangeKind(
  baseline: RunStepRecord | null,
  candidate: RunStepRecord | null
): RunComparisonRow['changeKind'] {
  if (!baseline && !candidate) return 'unchanged'
  if (!baseline) return 'added'
  if (!candidate) return 'removed'
  if (baseline.type !== candidate.type) return 'type-changed'
  if (baseline.status !== candidate.status || baseline.exitCode !== candidate.exitCode) return 'status-changed'
  if (getStepComparableContent(baseline) !== getStepComparableContent(candidate)) return 'content-changed'
  return 'unchanged'
}

export function buildRunComparisonRows(
  baseline: RunRecord,
  candidate: RunRecord
): RunComparisonRow[] {
  const maxLength = Math.max(baseline.steps.length, candidate.steps.length)

  return Array.from({ length: maxLength }, (_, index) => {
    const baselineStep = baseline.steps.find((step) => step.sourceIndex === index) ?? null
    const candidateStep = candidate.steps.find((step) => step.sourceIndex === index) ?? null
    const changeKind = getRunComparisonChangeKind(baselineStep, candidateStep)

    return {
      key: `${baseline.runId}-${candidate.runId}-${index}`,
      index,
      baseline: baselineStep,
      candidate: candidateStep,
      changed: changeKind !== 'unchanged',
      changeKind
    }
  })
}

export function buildRunComparisonSummary(
  baseline: RunRecord,
  candidate: RunRecord
): RunComparisonSummary {
  const rows = buildRunComparisonRows(baseline, candidate)
  const baselineDurationMs = getDurationMs(baseline.startedAt, baseline.endedAt)
  const candidateDurationMs = getDurationMs(candidate.startedAt, candidate.endedAt)

  return {
    changedSteps: rows.filter((row) => row.changed).length,
    addedSteps: rows.filter((row) => row.changeKind === 'added').length,
    removedSteps: rows.filter((row) => row.changeKind === 'removed').length,
    regressions: rows.filter((row) => !isStepRegression(row.baseline) && isStepRegression(row.candidate)).length,
    fixes: rows.filter((row) => isStepFixed(row.baseline, row.candidate)).length,
    baselineDurationMs,
    candidateDurationMs,
    durationDeltaMs:
      baselineDurationMs !== null && candidateDurationMs !== null
        ? candidateDurationMs - baselineDurationMs
        : null
  }
}
