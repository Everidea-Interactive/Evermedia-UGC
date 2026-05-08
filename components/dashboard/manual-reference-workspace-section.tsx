'use client'

import { Package2 } from 'lucide-react'

import {
  peopleReferenceCards,
  styleReferenceCards,
} from '@/components/dashboard/manual-workspace-config'
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
  const assets = useGenerationStore((state) => state.assets)
  const products = useGenerationStore((state) => state.products)
  const clearNamedAsset = useGenerationStore((state) => state.clearNamedAsset)
  const clearProductSlot = useGenerationStore((state) => state.clearProductSlot)
  const resetGenerationState = useGenerationStore(
    (state) => state.resetGenerationState,
  )
  const setNamedAssetFile = useGenerationStore((state) => state.setNamedAssetFile)
  const setProductSlotFile = useGenerationStore(
    (state) => state.setProductSlotFile,
  )
  const productSlots = products.slice(0, 2)

  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader
            description="Stage every visual input here first. Keep the board fixed so people, styling, environment, and products remain easy to scan."
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
      </div>
    </section>
  )
}
