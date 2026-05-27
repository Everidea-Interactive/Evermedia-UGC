'use client'

import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  characterAgeGroups,
  characterGenders,
  creativeStyles,
  figureArtDirections,
  productCategories,
  shotEnvironments,
  subjectModes,
  cameraMovements,
} from '@/components/dashboard/manual-workspace-config'
import {
  ControlGroup,
  panelClassName,
  presetCompactTileClassName,
  presetGroupClassName,
  PresetGroupLabel,
  presetSubgroupClassName,
  presetTileClassName,
  SectionHeader,
} from '@/components/dashboard/manual-workspace-ui'
import type {
  CameraMovement,
  CharacterAgeGroup,
  CharacterGender,
  CreativeStyle,
  FigureArtDirection,
  ProductCategory,
  ShotEnvironment,
  SubjectMode,
} from '@/lib/generation/types'
import { cn } from '@/lib/utils'
import { useGenerationStore } from '@/store/use-generation-store'
import { useEffect } from 'react'

export function RefineRenderSection({ className }: { className?: string }) {
  const activeTab = useGenerationStore((state) => state.activeTab)
  const creativeStyle = useGenerationStore((state) => state.creativeStyle)
  const setCreativeStyle = useGenerationStore((state) => state.setCreativeStyle)
  const productCategory = useGenerationStore((state) => state.productCategory)
  const setProductCategory = useGenerationStore(
    (state) => state.setProductCategory,
  )
  const subjectMode = useGenerationStore((state) => state.subjectMode)
  const setSubjectMode = useGenerationStore((state) => state.setSubjectMode)
  const shotEnvironment = useGenerationStore((state) => state.shotEnvironment)
  const setShotEnvironment = useGenerationStore(
    (state) => state.setShotEnvironment,
  )
  const textPrompt = useGenerationStore((state) => state.textPrompt)
  const setTextPrompt = useGenerationStore((state) => state.setTextPrompt)
  const characterGender = useGenerationStore((state) => state.characterGender)
  const setCharacterGender = useGenerationStore(
    (state) => state.setCharacterGender,
  )
  const characterAgeGroup = useGenerationStore(
    (state) => state.characterAgeGroup,
  )
  const setCharacterAgeGroup = useGenerationStore(
    (state) => state.setCharacterAgeGroup,
  )
  const figureArtDirection = useGenerationStore(
    (state) => state.figureArtDirection,
  )
  const setFigureArtDirection = useGenerationStore(
    (state) => state.setFigureArtDirection,
  )
  const cameraMovement = useGenerationStore((state) => state.cameraMovement)
  const setCameraMovement = useGenerationStore(
    (state) => state.setCameraMovement,
  )
  const isLifestyle = subjectMode === 'lifestyle'
  const face1 = useGenerationStore((state) => state.assets.face1)
  const face2 = useGenerationStore((state) => state.assets.face2)
  const hasFaceReference = Boolean(face1.file) || Boolean(face2.file)
  const showDemographics = isLifestyle && !hasFaceReference

  useEffect(() => {
    if (hasFaceReference) {
      setCharacterGender('any')
      setCharacterAgeGroup('any')
    }
  }, [hasFaceReference, setCharacterGender, setCharacterAgeGroup])

  return (
    <section className={cn(panelClassName, 'preset-surface p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-3">
        <SectionHeader
          description="Set the structured preset first, then add any optional free-form direction."
          eyebrow="Preset"
          title="Build the generation preset"
        />

        <div className="grid gap-4 xl:grid-cols-12 xl:gap-x-4">
          <ControlGroup
            className={cn(presetGroupClassName, 'xl:col-span-4')}
            description="Person present or product-only."
            title="Subject Configuration"
          >
            <ToggleGroup
              aria-label="Subject Configuration"
              className="grid w-full grid-cols-2 gap-2"
              onValueChange={(value) => {
                if (value) {
                  setSubjectMode(value as SubjectMode)
                }
              }}
              type="single"
              value={subjectMode}
            >
              {subjectModes.map((mode) => (
                <ToggleGroupItem
                  className={presetCompactTileClassName}
                  key={mode.value}
                  value={mode.value}
                >
                  {mode.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              {subjectModes.find((mode) => mode.value === subjectMode)?.description ??
                'Choose the subject setup for this preset.'}
            </p>
          </ControlGroup>

          <ControlGroup
            className={cn(presetGroupClassName, 'xl:col-span-4')}
            description="High-level visual language."
            title="Photography Style"
          >
            <ToggleGroup
              aria-label="Creative Style"
              className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-2"
              onValueChange={(value) => {
                if (value) {
                  setCreativeStyle(value as CreativeStyle)
                }
              }}
              type="single"
              value={creativeStyle}
            >
              {creativeStyles.map((style) => (
                <ToggleGroupItem
                  className={presetCompactTileClassName}
                  key={style.value}
                  value={style.value}
                >
                  {style.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </ControlGroup>

          <ControlGroup
            className={cn(presetGroupClassName, 'xl:col-span-4')}
            description="Indoor or outdoor context."
            title="Shot Environment"
          >
            <ToggleGroup
              aria-label="Shot Environment"
              className="grid grid-cols-2 gap-2"
              onValueChange={(value) => {
                if (value) {
                  setShotEnvironment(value as ShotEnvironment)
                }
              }}
              type="single"
              value={shotEnvironment}
            >
              {shotEnvironments.map((environment) => {
                const Icon = environment.icon

                return (
                  <ToggleGroupItem
                    className={cn(presetCompactTileClassName, 'gap-2')}
                    key={environment.value}
                    value={environment.value}
                  >
                    <Icon className="size-4" suppressHydrationWarning />
                    <span>{environment.label}</span>
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              {shotEnvironments.find((environment) => environment.value === shotEnvironment)
                ?.description ?? 'Set the scene before generation.'}
            </p>
          </ControlGroup>

          <ControlGroup
            className={cn(presetGroupClassName, 'xl:col-span-8')}
            description="Campaign context for the generated prompt."
            title="Product Category"
          >
            <ToggleGroup
              aria-label="Product Category"
              className="grid grid-cols-[repeat(auto-fit,minmax(11.5rem,1fr))] gap-2"
              onValueChange={(value) => {
                if (value) {
                  setProductCategory(value as ProductCategory)
                }
              }}
              type="single"
              value={productCategory}
            >
              {productCategories.map((category) => {
                const Icon = category.icon

                return (
                  <ToggleGroupItem
                    className={cn(
                      presetTileClassName,
                      'justify-start gap-2 text-left',
                    )}
                    key={category.value}
                    value={category.value}
                  >
                    <Icon className="size-4" suppressHydrationWarning />
                    {category.label}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </ControlGroup>

          <ControlGroup
            className={cn(presetGroupClassName, 'xl:col-span-4')}
            description="Editorial direction when a person is present."
            title="Figure Art Direction"
          >
            <ToggleGroup
              aria-label="Figure Art Direction"
              className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-2"
              onValueChange={(value) => {
                if (value) {
                  setFigureArtDirection(value as FigureArtDirection)
                }
              }}
              type="single"
              value={figureArtDirection}
            >
              {figureArtDirections.map((option) => (
                <ToggleGroupItem
                  className={presetCompactTileClassName}
                  disabled={!isLifestyle}
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              {figureArtDirections.find((option) => option.value === figureArtDirection)
                ?.description ?? 'Choose the figure styling direction.'}
            </p>
            {!isLifestyle ? (
              <p className="text-xs text-muted-foreground">
                Figure art direction is available only for lifestyle presets.
              </p>
            ) : null}
          </ControlGroup>

          {activeTab === 'video' ? (
            <ControlGroup
              className={cn(presetGroupClassName, 'xl:col-span-12')}
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
                    className={presetCompactTileClassName}
                    key={movement.value}
                    value={movement.value}
                  >
                    {movement.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </ControlGroup>
          ) : null}

          {activeTab !== 'video' && (
            <ControlGroup
              className={cn(presetGroupClassName, 'xl:col-span-12')}
              description="Lifestyle presets can bias cast attributes without changing the reference board."
              title="Character Demographics (Auto-Prompt)"
            >
              <div
                className={cn(
                  'grid gap-3 lg:grid-cols-2 lg:gap-x-3',
                  !showDemographics && 'opacity-60',
                )}
              >
                <div className={cn(presetSubgroupClassName, 'grid gap-1.5 self-start')}>
                  <PresetGroupLabel>Gender</PresetGroupLabel>
                  <ToggleGroup
                    aria-label="Character Gender"
                    className="grid grid-cols-[repeat(auto-fit,minmax(6.75rem,1fr))] gap-2"
                    onValueChange={(value) => {
                      if (value) {
                        setCharacterGender(value as CharacterGender)
                      }
                    }}
                    type="single"
                    value={characterGender}
                  >
                    {characterGenders.map((option) => (
                      <ToggleGroupItem
                        className={presetCompactTileClassName}
                        disabled={!showDemographics}
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <div className={cn(presetSubgroupClassName, 'grid gap-1.5 self-start')}>
                  <PresetGroupLabel>Age Group</PresetGroupLabel>
                  <ToggleGroup
                    aria-label="Character Age Group"
                    className="grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-2"
                    onValueChange={(value) => {
                      if (value) {
                        setCharacterAgeGroup(value as CharacterAgeGroup)
                      }
                    }}
                    type="single"
                    value={characterAgeGroup}
                  >
                    {characterAgeGroups.map((option) => (
                      <ToggleGroupItem
                        className={presetCompactTileClassName}
                        disabled={!showDemographics}
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>
              {!showDemographics ? (
                hasFaceReference && isLifestyle ? (
                  <p className="text-xs text-muted-foreground">
                    Demographics disabled — face reference defines the character.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Demographics only apply to lifestyle presets.
                  </p>
                )
              ) : null}
            </ControlGroup>
          )}

          <ControlGroup
            className={cn(presetGroupClassName, 'xl:col-span-12')}
            description="Optional free-form direction appended after the structured preset."
            title="Additional Instructions"
          >
            <Textarea
              aria-label={
                activeTab === 'image'
                  ? 'Image generation additional instructions'
                  : 'Video generation additional instructions'
              }
              autoComplete="off"
              className="preset-textarea"
              onChange={(event) => setTextPrompt(event.target.value)}
              placeholder="Add any extra creative direction, for example: dramatic backlight, golden hour, neon rim light…"
              value={textPrompt}
            />
            <p className="text-xs text-muted-foreground">
              Use this only for direction that does not fit the preset controls.
            </p>
          </ControlGroup>
        </div>
      </div>
    </section>
  )
}
