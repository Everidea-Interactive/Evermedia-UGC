'use client'

import { useEffect } from 'react'
import { Film, ImageIcon } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

import {
  getEmptyStateCopy,
  panelClassName,
  ReferenceCard,
  ReferenceCardGroup,
  SectionHeader,
} from '@/components/dashboard/manual-workspace-ui'
import {
  getMotionControlImageUploadSupport,
  getMotionControlVideoUploadSupport,
} from '@/lib/generation/upload-support'
import { readVideoDurationSeconds } from '@/lib/generation/video-metadata'
import { cn } from '@/lib/utils'
import { useGenerationStore } from '@/store/use-generation-store'

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
  const setMotionControlAdditionalInstructions = useGenerationStore(
    (state) => state.setMotionControlAdditionalInstructions,
  )
  const setMotionControlReferenceImageFile = useGenerationStore(
    (state) => state.setMotionControlReferenceImageFile,
  )
  const imageUploadSupport = getMotionControlImageUploadSupport()
  const videoUploadSupport = getMotionControlVideoUploadSupport()

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
          description="Upload one character reference image and one motion video. Kling Motion Control uses the character image as a strong global visual reference, so the result may inherit wardrobe, props, or held products from that image."
          eyebrow="Reference board"
          title="Build the motion-control input set"
        />
        <div className="flex flex-col gap-1">
          <p className="text-xs leading-5 text-muted-foreground">
            {imageUploadSupport.hint}
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            {videoUploadSupport.hint}
          </p>
        </div>
        <ReferenceCardGroup title="Motion Control Inputs">
          <ReferenceCard
            accept={imageUploadSupport.accept}
            emptyStateLabel={getEmptyStateCopy('image')}
            icon={ImageIcon}
            inputId="motion-control-reference-image"
            onClear={clearMotionControlReferenceImage}
            onSelect={setMotionControlReferenceImageFile}
            slot={motionControl.referenceImage}
          />
          <ReferenceCard
            accept={videoUploadSupport.accept}
            emptyStateLabel={getEmptyStateCopy('video')}
            icon={Film}
            inputId="motion-control-motion-video"
            onClear={clearMotionControlMotionVideo}
            onSelect={setMotionControlMotionVideoFile}
            slot={motionControl.motionVideo}
          />
        </ReferenceCardGroup>
        <div className="flex flex-col gap-2">
          <SectionHeader
            description="Optional extra direction appended to the motion-control baseline."
            eyebrow="Instructions"
            title="Additional Instructions"
          />
          <Textarea
            onChange={(event) =>
              setMotionControlAdditionalInstructions(event.target.value)
            }
            placeholder="Optional extra direction for continuity, readability, or action emphasis."
            value={motionControl.additionalInstructions}
          />
        </div>
      </div>
    </section>
  )
}
