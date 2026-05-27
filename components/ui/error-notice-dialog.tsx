'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ErrorNoticeDialogProps = {
  description?: string | null
  detail?: string | null
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
}

export function ErrorNoticeDialog({
  description,
  detail,
  onOpenChange,
  open,
  title,
}: ErrorNoticeDialogProps) {
  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/72 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[51] w-[min(92vw,640px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-2xl',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          <div className="flex flex-col gap-3 p-4 sm:gap-3.5 sm:p-5">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-destructive/40 bg-destructive/10 text-destructive">
                <AlertTriangle className="size-4.5" suppressHydrationWarning />
              </span>
              <div className="min-w-0">
                <Dialog.Title className="text-lg font-semibold leading-7 text-foreground">
                  {title}
                </Dialog.Title>
              </div>
              <span aria-hidden="true" className="h-8 w-8" />
            </div>

            {description ? (
              <Dialog.Description className="text-sm leading-6 text-muted-foreground sm:text-[0.98rem]">
                {description}
              </Dialog.Description>
            ) : null}

            {detail ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Technical details
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-foreground/90">
                  {detail}
                </p>
              </div>
            ) : null}

            <div className="flex justify-end pt-0.5">
              <Dialog.Close asChild>
                <Button className="min-w-20" type="button">
                  Close
                </Button>
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
