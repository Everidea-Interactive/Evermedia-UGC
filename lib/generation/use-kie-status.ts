'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import type {
  GenerationRun,
  KieStatusResponse,
} from '@/lib/generation/types'

const creditRefreshIntervalMs = 60_000
const emptyKieStatus: KieStatusResponse = {
  connected: false,
  credits: null,
  error: null,
  fetchedAt: null,
  source: null,
}

function isTerminalRunStatus(status: GenerationRun['status']) {
  return status === 'success' || status === 'partial-success' || status === 'error'
}

export function useKieStatus(generationRun: GenerationRun) {
  const [status, setStatus] = useState<KieStatusResponse>(emptyKieStatus)
  const [isLoading, setIsLoading] = useState(true)
  const lastSubmittedRunIdRef = useRef<string | null>(null)
  const lastTerminalKeyRef = useRef<string | null>(null)

  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/kie/status', {
        cache: 'no-store',
      })
      const payload = (await response.json()) as KieStatusResponse

      setStatus(
        response.ok
          ? payload
          : {
              connected: false,
              credits: null,
              error: payload.error ?? 'Unable to read KIE status.',
              fetchedAt: new Date().toISOString(),
              source: null,
            },
      )
    } catch (error) {
      setStatus({
        connected: false,
        credits: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to read KIE status.',
        fetchedAt: new Date().toISOString(),
        source: null,
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const submittedRunId =
    generationRun.runId && generationRun.variants.length > 0
      ? generationRun.runId
      : null
  const terminalRunKey =
    generationRun.runId && isTerminalRunStatus(generationRun.status)
      ? `${generationRun.runId}:${generationRun.status}`
      : null

  useEffect(() => {
    void refreshStatus()

    const interval = window.setInterval(() => {
      void refreshStatus()
    }, creditRefreshIntervalMs)

    return () => {
      window.clearInterval(interval)
    }
  }, [refreshStatus])

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
    isLoading,
    status,
  }
}
