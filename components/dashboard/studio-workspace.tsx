'use client'

import { useEffect } from 'react'

import { StudioShell } from '@/components/dashboard/studio-shell'
import { useGenerationStore } from '@/store/use-generation-store'

export function StudioWorkspace() {
  useEffect(() => {
    return () => {
      useGenerationStore.getState().disposeGenerationState()
    }
  }, [])

  return <StudioShell />
}
