// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ManagedAccountListItem } from '@/lib/auth/access-repository'

describe('AccountsManagementPage', () => {
  afterEach(() => {
    cleanup()
  })

  const accounts: ManagedAccountListItem[] = [
    {
      createdAt: '2026-05-07T02:00:00.000Z',
      email: 'member@example.com',
      lastSignInAt: null,
      roles: ['member'],
      status: 'active',
      updatedAt: '2026-05-07T02:00:00.000Z',
      userId: 'member-1',
    },
  ]

  it('opens create-account and set-password forms inside dialogs instead of rendering them inline', async () => {
    const { AccountsManagementPage } = await import(
      '@/components/accounts/accounts-management-page'
    )

    render(<AccountsManagementPage accounts={accounts} banner={null} />)

    expect(screen.queryByText('New accounts default to full member access')).toBeNull()
    expect(screen.queryByLabelText('Email')).toBeNull()
    expect(screen.queryByPlaceholderText('New password')).toBeNull()

    const createButtons = screen.getAllByRole('button', { name: 'Create Account' })
    expect(createButtons).toHaveLength(1)

    fireEvent.click(createButtons[0])

    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeTruthy()
    expect(screen.getByLabelText('Email')).toBeTruthy()
    expect(screen.getByLabelText('Password')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Show password' })).toBeTruthy()
    expect(screen.queryByPlaceholderText('user@example.com')).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Cancel' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Set Password' })[0])

    expect(screen.getByRole('heading', { name: 'Set Password' })).toBeTruthy()
    expect(screen.getByText('member@example.com')).toBeTruthy()
    expect(screen.getByPlaceholderText('New password')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Cancel' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Set Password' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Update Role' })[0])

    expect(screen.getByRole('heading', { name: 'Update Role' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Role' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Update Role' })).toBeTruthy()
  })

  it('vertically centers the action cluster against the account details on large screens', async () => {
    const { AccountsManagementPage } = await import(
      '@/components/accounts/accounts-management-page'
    )

    render(<AccountsManagementPage accounts={accounts} banner={null} />)

    const actionGroup = screen
      .getAllByRole('button', { name: 'Set Password' })[0]
      .closest('div.flex.flex-wrap.items-center.justify-end.gap-3.lg\\:min-w-\\[420px\\]')

    expect(actionGroup?.className).toContain('items-center')
    expect(actionGroup?.className).toContain('lg:items-center')
  })

  it('renders the manage accounts header and account list inside one shared card', async () => {
    const { AccountsManagementPage } = await import(
      '@/components/accounts/accounts-management-page'
    )

    const { container } = render(
      <AccountsManagementPage accounts={accounts} banner={null} />,
    )

    expect(container.querySelectorAll('section.rounded-2xl.border.border-border.bg-card'))
      .toHaveLength(1)
    expect(screen.getAllByRole('heading', { name: 'Manage Accounts' })).toHaveLength(1)
    expect(screen.queryByRole('heading', { name: 'Managed Accounts' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Create Account' })).toHaveLength(1)
  })

  it('closes the create-account dialog without restoring focus to the trigger', async () => {
    const { AccountsManagementPage } = await import(
      '@/components/accounts/accounts-management-page'
    )

    render(<AccountsManagementPage accounts={accounts} banner={null} />)

    const trigger = screen.getByRole('button', { name: 'Create Account' })

    fireEvent.click(trigger)

    expect(screen.getByRole('dialog')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).not.toBe(trigger)

    fireEvent.click(trigger)

    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(document.activeElement).toBe(screen.getByLabelText('Email'))
  })

  it('prevents account dialogs from dismissing on outside interaction', async () => {
    const { preventAccountDialogOutsideDismiss } = await import(
      '@/components/accounts/accounts-management-page'
    )

    const preventDefault = vi.fn()

    preventAccountDialogOutsideDismiss({ preventDefault })

    expect(preventDefault).toHaveBeenCalledTimes(1)
  })
})
