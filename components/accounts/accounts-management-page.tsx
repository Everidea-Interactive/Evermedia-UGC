'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useRef, useState } from 'react'

import { PasswordVisibilityInput } from '@/components/auth/password-visibility-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { ManagedAccountListItem } from '@/lib/auth/access-repository'

type BannerState = {
  text: string
  tone: 'error' | 'info'
} | null

type ModalButtonVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost'

export function preventAccountDialogOutsideDismiss(event: { preventDefault: () => void }) {
  event.preventDefault()
}

function AccountFormDialog({
  children,
  description,
  formId,
  submitLabel,
  title,
  triggerClassName,
  triggerLabel,
  triggerVariant = 'default',
}: {
  children: React.ReactNode
  description?: string
  formId: string
  submitLabel: string
  title: string
  triggerClassName?: string
  triggerLabel: string
  triggerVariant?: ModalButtonVariant
}) {
  const [open, setOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Trigger asChild>
        <Button
          className={triggerClassName}
          ref={triggerRef}
          type="button"
          variant={triggerVariant}
        >
          {triggerLabel}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/72 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[51] w-[min(calc(100vw-2rem),34rem)] -translate-x-1/2 -translate-y-1/2 rounded-[1.25rem] border border-border bg-card p-6 shadow-2xl outline-none"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            triggerRef.current?.blur()
          }}
          onInteractOutside={(event) => {
            preventAccountDialogOutsideDismiss(event)
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            const initialField = contentRef.current?.querySelector<
              HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement
            >('input:not([type="hidden"]), select, textarea, button')

            initialField?.focus({ preventScroll: true })
          }}
          onPointerDownOutside={(event) => {
            preventAccountDialogOutsideDismiss(event)
          }}
          ref={contentRef}
        >
          <Dialog.Title className="text-lg font-semibold tracking-[-0.01em] text-foreground">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
            {description ?? 'Complete the form below and submit the account change.'}
          </Dialog.Description>
          <div className="mt-5">{children}</div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Dialog.Close asChild>
              <Button className="w-full" type="button" variant="outline">
                Cancel
              </Button>
            </Dialog.Close>
            <Button className="w-full" form={formId} type="submit">
              {submitLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function AccountsManagementPage({
  accounts,
  banner,
}: {
  accounts: ManagedAccountListItem[]
  banner: BannerState
}) {
  return (
    <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6">
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Accounts
            </p>
            <h1 className="text-2xl font-semibold text-foreground">Manage Accounts</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Create studio accounts, update roles, reset passwords, and disable or
              restore access without removing library or generation data.
            </p>
          </div>
          <AccountFormDialog
            description="New accounts default to full member access unless you explicitly assign `super_admin`."
            formId="create-account-form"
            submitLabel="Create Account"
            title="Create Account"
            triggerLabel="Create Account"
          >
            <form
              action="/api/accounts"
              className="grid gap-4"
              id="create-account-form"
              method="post"
            >
              <input name="intent" type="hidden" value="create" />
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Email
                <Input autoComplete="email" name="email" required type="email" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Password
                <PasswordVisibilityInput
                  autoComplete="new-password"
                  buttonClassName="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
                  className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  containerClassName="relative"
                  name="password"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Role
                <Select defaultValue="member" name="roles">
                  <option value="member">Member</option>
                  <option value="super_admin">Super Admin</option>
                </Select>
              </label>
            </form>
          </AccountFormDialog>
        </div>

        {banner ? (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              banner.tone === 'error'
                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                : 'border-border bg-secondary/60 text-foreground'
            }`}
            role={banner.tone === 'error' ? 'alert' : 'status'}
          >
            {banner.text}
          </div>
        ) : null}

        <div className="mt-6 border-t border-border/70 pt-6">
          <div className="space-y-4">
            {accounts.map((account) => (
              <article
                className="rounded-2xl border border-border/80 bg-background p-4"
                key={account.userId}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">
                        {account.email ?? account.userId}
                      </h3>
                      <Badge variant={account.status === 'active' ? 'default' : 'outline'}>
                        {account.status}
                      </Badge>
                      {account.roles.map((role) => (
                        <Badge key={role} variant="secondary">
                          {role}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>User ID: {account.userId}</p>
                      <p>Created: {new Date(account.createdAt).toLocaleString()}</p>
                      <p>Updated: {new Date(account.updatedAt).toLocaleString()}</p>
                      <p>
                        Last sign in:{' '}
                        {account.lastSignInAt
                          ? new Date(account.lastSignInAt).toLocaleString()
                          : 'Never'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 lg:min-w-[420px] lg:items-center">
                    <div>
                      <AccountFormDialog
                        description={`Set a new password for ${account.email ?? account.userId}.`}
                        formId={`set-password-form-${account.userId}`}
                        submitLabel="Set Password"
                        title="Set Password"
                        triggerLabel="Set Password"
                        triggerVariant="secondary"
                      >
                        <form
                          action="/api/accounts"
                          className="grid gap-4"
                          id={`set-password-form-${account.userId}`}
                          method="post"
                        >
                          <input name="intent" type="hidden" value="set_password" />
                          <input name="userId" type="hidden" value={account.userId} />
                          <label className="grid gap-2 text-sm font-medium text-foreground">
                            New password
                            <Input
                              name="password"
                              placeholder="New password"
                              required
                              type="password"
                            />
                          </label>
                        </form>
                      </AccountFormDialog>
                    </div>

                    <div>
                      <AccountFormDialog
                        description={`Update the role assignment for ${account.email ?? account.userId}.`}
                        formId={`update-role-form-${account.userId}`}
                        submitLabel="Update Role"
                        title="Update Role"
                        triggerLabel="Update Role"
                        triggerVariant="outline"
                      >
                        <form
                          action="/api/accounts"
                          className="grid gap-4"
                          id={`update-role-form-${account.userId}`}
                          method="post"
                        >
                          <input name="intent" type="hidden" value="set_roles" />
                          <input name="userId" type="hidden" value={account.userId} />
                          <label className="grid gap-2 text-sm font-medium text-foreground">
                            Role
                            <Select defaultValue={account.roles[0] ?? 'member'} name="roles">
                              <option value="member">Member</option>
                              <option value="super_admin">Super Admin</option>
                            </Select>
                          </label>
                        </form>
                      </AccountFormDialog>
                    </div>

                    <form action="/api/accounts" method="post">
                      <input
                        name="intent"
                        type="hidden"
                        value={account.status === 'active' ? 'disable' : 'enable'}
                      />
                      <input name="userId" type="hidden" value={account.userId} />
                      <Button
                        type="submit"
                        variant={account.status === 'active' ? 'destructive' : 'default'}
                      >
                        {account.status === 'active' ? 'Disable Account' : 'Re-enable Account'}
                      </Button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
