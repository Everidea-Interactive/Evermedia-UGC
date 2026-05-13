'use client'

import { useEffect, useRef } from 'react'

import { StudioShell } from '@/components/dashboard/studio-shell'
import { useGenerationStore } from '@/store/use-generation-store'

export function StudioWorkspace() {
  const mountCycleRef = useRef(0)

  useEffect(() => {
    const mountCycle = mountCycleRef.current + 1
    mountCycleRef.current = mountCycle

    return () => {
      window.setTimeout(() => {
        if (mountCycleRef.current !== mountCycle) {
          return
        }

        useGenerationStore.getState().disposeGenerationState()
      }, 0)
    }
  }, [])

  return <StudioShell />
}
