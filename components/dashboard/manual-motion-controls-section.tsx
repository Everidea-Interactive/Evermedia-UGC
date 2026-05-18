'use client'

import { cameraMovements } from '@/components/dashboard/manual-workspace-config'
import {
  ControlGroup,
  panelClassName,
  SectionHeader,
  tileClassName,
} from '@/components/dashboard/manual-workspace-ui'
import type { CameraMovement } from '@/lib/generation/types'
import { cn } from '@/lib/utils'
import { useGenerationStore } from '@/store/use-generation-store'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export function MotionControlsSection({ className }: { className?: string }) {
  const cameraMovement = useGenerationStore((state) => state.cameraMovement)
  const setCameraMovement = useGenerationStore(
    (state) => state.setCameraMovement,
  )

  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-5">
        <SectionHeader
          description="These settings stay after the reference board because they only matter once the input set and brief are established."
          eyebrow="Motion controls"
          title="Tune video behavior"
        />

        <div className="grid gap-5">
          <ControlGroup
            description="Camera movement is treated as a structured prompt modifier."
            title="Movement language"
          >
            <ToggleGroup
              aria-label="Camera Movement"
              className="grid grid-cols-2 gap-2"
              onValueChange={(value) =>
                setCameraMovement(value ? (value as CameraMovement) : null)
              }
              type="single"
              value={cameraMovement ?? ''}
            >
              {cameraMovements.map((movement) => (
                <ToggleGroupItem
                  className={tileClassName}
                  key={movement.value}
                  value={movement.value}
                >
                  {movement.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </ControlGroup>
        </div>
      </div>
    </section>
  )
}
