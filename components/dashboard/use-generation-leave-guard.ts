'use client'

import { useEffect } from 'react'

import { useGenerationStore } from '@/store/use-generation-store'
import { isGenerationInProgress } from '@/store/use-generation-store'

const LEAVE_GUARD_MESSAGE =
  'Generation in progress. Leaving may interrupt your workflow.'

export function useGenerationLeaveGuard() {
  useEffect(() => {
    const checkAndBlock = (event: BeforeUnloadEvent) => {
      if (isGenerationInProgress(useGenerationStore.getState())) {
        event.preventDefault()
        event.returnValue = LEAVE_GUARD_MESSAGE
      }
    }

    window.addEventListener('beforeunload', checkAndBlock)

    return () => {
      window.removeEventListener('beforeunload', checkAndBlock)
    }
  }, [])
}
