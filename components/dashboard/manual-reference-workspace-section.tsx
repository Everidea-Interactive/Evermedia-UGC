'use client'

import { Image, Package2, ScanLine } from 'lucide-react'

import {
  peopleReferenceCards,
  styleReferenceCards,
} from '@/components/dashboard/manual-workspace-config'
import {
  getMaxVideoReferenceCount,
  supportsVideoEndFrameGuidance,
  supportsVideoFirstLastFramePair,
} from '@/lib/generation/model-mapping'
import {
  panelClassName,
  ReferenceCard,
  ReferenceCardGroup,
  SectionHeader,
} from '@/components/dashboard/manual-workspace-ui'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useGenerationStore } from '@/store/use-generation-store'

export function ReferenceWorkspaceSection({ className }: { className?: string }) {
  const activeTab = useGenerationStore((state) => state.activeTab)
  const assets = useGenerationStore((state) => state.assets)
  const products = useGenerationStore((state) => state.products)
  const videoReferences = useGenerationStore((state) => state.videoReferences)
  const videoModel = useGenerationStore((state) => state.videoModel)
  const clearNamedAsset = useGenerationStore((state) => state.clearNamedAsset)
  const clearProductSlot = useGenerationStore((state) => state.clearProductSlot)
  const clearVideoReference = useGenerationStore((state) => state.clearVideoReference)
  const resetGenerationState = useGenerationStore(
    (state) => state.resetGenerationState,
  )
  const setNamedAssetFile = useGenerationStore((state) => state.setNamedAssetFile)
  const setProductSlotFile = useGenerationStore(
    (state) => state.setProductSlotFile,
  )
  const setVideoReferenceFile = useGenerationStore(
    (state) => state.setVideoReferenceFile,
  )
  const productSlots = products.slice(0, 2)
  const videoReferenceLimit = getMaxVideoReferenceCount(videoModel)
  const isKlingVideoModel = videoModel === 'kling-3.0'
  const showDedicatedFramePair = supportsVideoFirstLastFramePair(videoModel)
  const showEndFrameReference =
    supportsVideoEndFrameGuidance(videoModel) &&
    (!showDedicatedFramePair || Boolean(assets.firstFrame.file))
  const visibleVideoReferenceCount = Math.min(
    videoReferenceLimit,
    Math.max(
      1,
      videoReferences.filter((slot) => slot.file).length + 1,
    ),
  )
  const visibleVideoReferences = videoReferences.slice(0, visibleVideoReferenceCount)

  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader
            description={
              activeTab === 'video'
                ? isKlingVideoModel
                  ? 'Kling 3.0 supports first-frame and optional end-frame guidance here. Generic Reference 1/2/3 cards are hidden because Kling does not use them in this flow.'
                  : 'Stage start-frame references here. Begin with Reference 1, then unlock the next card only when the selected model supports more visual guidance.'
                : 'Stage every visual input here first. Keep the board fixed so people, styling, environment, and products remain easy to scan.'
            }
            eyebrow="Reference board"
            title="Build the input set"
          />
          <Button
            onClick={() => resetGenerationState()}
            size="sm"
            variant="ghost"
          >
            Reset
          </Button>
        </div>

        {activeTab === 'video' ? (
          <ReferenceCardGroup title="References">
            {isKlingVideoModel
              ? null
              : visibleVideoReferences.map((referenceSlot) => (
                  <ReferenceCard
                    icon={Image}
                    inputId={referenceSlot.id}
                    key={referenceSlot.id}
                    onClear={() => clearVideoReference(referenceSlot.id)}
                    onSelect={(file) => setVideoReferenceFile(referenceSlot.id, file)}
                    slot={referenceSlot}
                  />
                ))}
            {showDedicatedFramePair ? (
              <ReferenceCard
                icon={Image}
                inputId="asset-first-frame"
                onClear={() => clearNamedAsset('firstFrame')}
                onSelect={(file) => setNamedAssetFile('firstFrame', file)}
                slot={assets.firstFrame}
              />
            ) : null}
            {showEndFrameReference ? (
              <ReferenceCard
                icon={ScanLine}
                inputId="asset-end-frame"
                onClear={() => clearNamedAsset('endFrame')}
                onSelect={(file) => setNamedAssetFile('endFrame', file)}
                slot={assets.endFrame}
              />
            ) : null}
          </ReferenceCardGroup>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-x-6">
            <div className="grid gap-5">
              <ReferenceCardGroup title="People">
                {peopleReferenceCards.map((asset) => (
                  <ReferenceCard
                    icon={asset.icon}
                    inputId={`asset-${asset.key}`}
                    key={asset.key}
                    onClear={() => clearNamedAsset(asset.key)}
                    onSelect={(file) => setNamedAssetFile(asset.key, file)}
                    slot={assets[asset.key]}
                  />
                ))}
              </ReferenceCardGroup>

              <ReferenceCardGroup title="Style & Environment">
                {styleReferenceCards.map((asset) => (
                  <ReferenceCard
                    icon={asset.icon}
                    inputId={`asset-${asset.key}`}
                    key={asset.key}
                    onClear={() => clearNamedAsset(asset.key)}
                    onSelect={(file) => setNamedAssetFile(asset.key, file)}
                    slot={assets[asset.key]}
                  />
                ))}
              </ReferenceCardGroup>
            </div>

            <ReferenceCardGroup className="xl:self-start" title="Products">
              {productSlots.map((product) => (
                <ReferenceCard
                  icon={Package2}
                  inputId={`product-${product.id}`}
                  key={product.id}
                  onClear={() => clearProductSlot(product.id)}
                  onSelect={(file) => setProductSlotFile(product.id, file)}
                  slot={product}
                />
              ))}
            </ReferenceCardGroup>
          </div>
        )}
      </div>
    </section>
  )
}
