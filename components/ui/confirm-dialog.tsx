'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { LoaderCircle } from 'lucide-react'
import { useRef } from 'react'

import { Button, type ButtonProps } from '@/components/ui/button'

type ConfirmDialogProps = {
  cancelLabel?: string
  confirmLabel?: string
  confirmVariant?: NonNullable<ButtonProps['variant']>
  description?: string
  isBusy?: boolean
  onConfirm: () => void | Promise<void>
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
}

function preventDismissWhileBusy(
  event: {
    preventDefault: () => void
  },
  isBusy: boolean,
) {
  if (!isBusy) {
    return
  }

  event.preventDefault()
}

export function ConfirmDialog({
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  confirmVariant = 'destructive',
  description,
  isBusy = false,
  onConfirm,
  onOpenChange,
  open,
  title,
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null)

  return (
    <Dialog.Root
      onOpenChange={(nextOpen) => {
        if (isBusy && !nextOpen) {
          return
        }

        onOpenChange(nextOpen)
      }}
      open={open}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/72 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),30rem)] -translate-x-1/2 -translate-y-1/2 rounded-[1.25rem] border border-border bg-card p-6 shadow-2xl outline-none"
          onEscapeKeyDown={(event) => {
            preventDismissWhileBusy(event, isBusy)
          }}
          onInteractOutside={(event) => {
            preventDismissWhileBusy(event, isBusy)
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            cancelButtonRef.current?.focus({ preventScroll: true })
          }}
          onPointerDownOutside={(event) => {
            preventDismissWhileBusy(event, isBusy)
          }}
        >
          <Dialog.Title className="text-lg font-semibold tracking-[-0.01em] text-foreground">
            {title}
          </Dialog.Title>

          {description ? (
            <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </Dialog.Description>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              disabled={isBusy}
              onClick={() => {
                onOpenChange(false)
              }}
              ref={cancelButtonRef}
              type="button"
              variant="outline"
            >
              {cancelLabel}
            </Button>

            <Button
              disabled={isBusy}
              onClick={() => {
                void onConfirm()
              }}
              type="button"
              variant={confirmVariant}
            >
              {isBusy ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  {confirmLabel}
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
