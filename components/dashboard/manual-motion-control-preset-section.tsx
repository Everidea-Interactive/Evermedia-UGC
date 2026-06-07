'use client'

import {
  presetCompactTileClassName,
  presetGroupClassName,
  PresetGroupLabel,
} from '@/components/dashboard/manual-workspace-ui'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useGenerationStore } from '@/store/use-generation-store'

export function ManualMotionControlPresetSection() {
  const motionControl = useGenerationStore((state) => state.motionControl)
  const setMotionControlAdditionalInstructions = useGenerationStore(
    (state) => state.setMotionControlAdditionalInstructions,
  )
  const setMotionControlPreset = useGenerationStore(
    (state) => state.setMotionControlPreset,
  )

  return (
    <section className={presetGroupClassName}>
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <PresetGroupLabel>Replacement Focus</PresetGroupLabel>
          <ToggleGroup
            onValueChange={(value) =>
              value && setMotionControlPreset(value as typeof motionControl.preset)
            }
            type="single"
            value={motionControl.preset}
          >
            <ToggleGroupItem className={presetCompactTileClassName} value="character">
              Character
            </ToggleGroupItem>
            <ToggleGroupItem className={presetCompactTileClassName} value="product">
              Product
            </ToggleGroupItem>
            <ToggleGroupItem
              className={presetCompactTileClassName}
              value="character-product"
            >
              Character + Product
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex flex-col gap-2">
          <PresetGroupLabel>Additional Instructions</PresetGroupLabel>
          <Textarea
            onChange={(event) =>
              setMotionControlAdditionalInstructions(event.target.value)
            }
            placeholder="Optional extra direction. This will be appended to the hidden preset guidance."
            value={motionControl.additionalInstructions}
          />
        </div>
      </div>
    </section>
  )
}
