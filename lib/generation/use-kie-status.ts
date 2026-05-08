'use client'

import {
  useEffect,
  useRef,
} from 'react'

import type { GenerationRun } from '@/lib/generation/types'
import { useKieStatusRuntime } from '@/lib/generation/use-kie-runtime'

function isTerminalRunStatus(status: GenerationRun['status']) {
  return (
    status === 'success' ||
    status === 'partial-success' ||
    status === 'error' ||
    status === 'cancelled'
  )
}

export function useSharedKieStatus() {
  const runtime = useKieStatusRuntime()

  return {
    error: runtime.error,
    isLoading: runtime.isLoading,
    refreshStatus: runtime.refreshStatus,
    status: runtime.data,
  }
}

export function useKieStatus(generationRun: GenerationRun) {
  const { error, isLoading, refreshStatus, status } = useSharedKieStatus()
  const lastSubmittedRunIdRef = useRef<string | null>(null)
  const lastTerminalKeyRef = useRef<string | null>(null)

  const submittedRunId =
    generationRun.runId && generationRun.variants.length > 0
      ? generationRun.runId
      : null
  const terminalRunKey =
    generationRun.runId && isTerminalRunStatus(generationRun.status)
      ? `${generationRun.runId}:${generationRun.status}`
      : null

  useEffect(() => {
    if (!submittedRunId || lastSubmittedRunIdRef.current === submittedRunId) {
      return
    }

    lastSubmittedRunIdRef.current = submittedRunId
    void refreshStatus()
  }, [refreshStatus, submittedRunId])

  useEffect(() => {
    if (!terminalRunKey || lastTerminalKeyRef.current === terminalRunKey) {
      return
    }

    lastTerminalKeyRef.current = terminalRunKey
    void refreshStatus()
  }, [refreshStatus, terminalRunKey])

  return {
    error,
    isLoading,
    refreshStatus,
    status,
  }
}
