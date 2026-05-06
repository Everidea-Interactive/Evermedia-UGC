'use client'

import { useEffect, useState } from 'react'

import { ErrorNoticeDialog } from '@/components/ui/error-notice-dialog'
import { getGenerationFailureNotice } from '@/lib/generation/run-copy'
import { useGenerationStore } from '@/store/use-generation-store'

export function GenerationErrorNoticeDialog() {
  const generationRun = useGenerationStore((state) => state.generationRun)
  const generationErrorEventId = useGenerationStore(
    (state) => state.generationErrorEventId,
  )
  const [isOpen, setIsOpen] = useState(false)
  const [notice, setNotice] = useState(() => getGenerationFailureNotice(null))

  useEffect(() => {
    if (
      generationErrorEventId === 0 ||
      generationRun.status !== 'error' ||
      !generationRun.error
    ) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setNotice(getGenerationFailureNotice(generationRun.error ?? ''))
      setIsOpen(true)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [generationErrorEventId, generationRun.error, generationRun.status])

  return (
    <ErrorNoticeDialog
      description={notice.message}
      detail={notice.detail}
      onOpenChange={setIsOpen}
      open={isOpen}
      title={notice.title}
    />
  )
}
