'use client'

import { useEffect } from 'react'
import { Film, ImageIcon } from 'lucide-react'

import {
  getAcceptForMediaKind,
  getEmptyStateCopy,
  panelClassName,
  ReferenceCard,
  ReferenceCardGroup,
  SectionHeader,
} from '@/components/dashboard/manual-workspace-ui'
import { readVideoDurationSeconds } from '@/lib/generation/video-metadata'
import { cn } from '@/lib/utils'
import { useGenerationStore } from '@/store/use-generation-store'

const presetDescriptions = {
  character: 'Use an image that clearly shows the replacement character.',
  product:
    'Use an image that clearly shows the replacement product in the intended handling or framing.',
  'character-product':
    'Use an image that clearly shows both the replacement character and product together in near-final composition.',
} as const

export function ManualMotionControlReferenceSection({
  className,
}: {
  className?: string
}) {
  const motionControl = useGenerationStore((state) => state.motionControl)
  const clearMotionControlMotionVideo = useGenerationStore(
    (state) => state.clearMotionControlMotionVideo,
  )
  const clearMotionControlReferenceImage = useGenerationStore(
    (state) => state.clearMotionControlReferenceImage,
  )
  const setMotionControlMotionVideoFile = useGenerationStore(
    (state) => state.setMotionControlMotionVideoFile,
  )
  const setMotionControlMotionVideoDuration = useGenerationStore(
    (state) => state.setMotionControlMotionVideoDuration,
  )
  const setMotionControlReferenceImageFile = useGenerationStore(
    (state) => state.setMotionControlReferenceImageFile,
  )

  useEffect(() => {
    const file = motionControl.motionVideo.file

    if (!file) {
      setMotionControlMotionVideoDuration(null)
      return
    }

    let isActive = true

    void readVideoDurationSeconds(file)
      .then((durationSeconds) => {
        if (isActive) {
          setMotionControlMotionVideoDuration(durationSeconds)
        }
      })
      .catch(() => {
        if (isActive) {
          setMotionControlMotionVideoDuration(null)
        }
      })

    return () => {
      isActive = false
    }
  }, [
    motionControl.motionVideo.file,
    setMotionControlMotionVideoDuration,
  ])

  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-5">
        <SectionHeader
          description={presetDescriptions[motionControl.preset]}
          eyebrow="Reference board"
          title="Build the motion-control input set"
        />
        <ReferenceCardGroup title="Motion Control Inputs">
          <ReferenceCard
            accept={getAcceptForMediaKind('image')}
            emptyStateLabel={getEmptyStateCopy('image')}
            icon={ImageIcon}
            inputId="motion-control-reference-image"
            onClear={clearMotionControlReferenceImage}
            onSelect={setMotionControlReferenceImageFile}
            slot={motionControl.referenceImage}
          />
          <ReferenceCard
            accept={getAcceptForMediaKind('video')}
            emptyStateLabel={getEmptyStateCopy('video')}
            icon={Film}
            inputId="motion-control-motion-video"
            onClear={clearMotionControlMotionVideo}
            onSelect={setMotionControlMotionVideoFile}
            slot={motionControl.motionVideo}
          />
        </ReferenceCardGroup>
      </div>
    </section>
  )
}
