import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createInitialState,
  useAllocatorStore,
} from '../store/useAllocatorStore'
import { openSettings, renderApp } from '../test/renderApp'

const store = () => useAllocatorStore.getState()
const root = () => document.documentElement

beforeEach(() => {
  localStorage.clear()
  useAllocatorStore.setState(createInitialState())
  root().removeAttribute('data-theme')
})

describe('the theme toggle', () => {
  it('starts on "match system", which sets no override', async () => {
    const user = userEvent.setup()
    renderApp()
    await openSettings(user)

    expect(
      screen.getByRole('button', { name: 'Match system' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(root()).not.toHaveAttribute('data-theme')
  })

  it('applies dark to the document', async () => {
    const user = userEvent.setup()
    renderApp()
    await openSettings(user)

    await user.click(screen.getByRole('button', { name: 'Dark' }))

    expect(root()).toHaveAttribute('data-theme', 'dark')
    expect(store().theme).toBe('dark')
  })

  it('applies light, which must override a dark OS preference', async () => {
    const user = userEvent.setup()
    renderApp()
    await openSettings(user)

    await user.click(screen.getByRole('button', { name: 'Light' }))

    expect(root()).toHaveAttribute('data-theme', 'light')
  })

  it('drops the override when handed back to the system', async () => {
    const user = userEvent.setup()
    renderApp()
    await openSettings(user)

    await user.click(screen.getByRole('button', { name: 'Dark' }))
    await user.click(screen.getByRole('button', { name: 'Match system' }))

    expect(root()).not.toHaveAttribute('data-theme')
  })

  it('marks only the active option as pressed', async () => {
    const user = userEvent.setup()
    renderApp()
    await openSettings(user)

    await user.click(screen.getByRole('button', { name: 'Dark' }))

    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(
      screen.getByRole('button', { name: 'Match system' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('reapplies the saved choice on a remount', async () => {
    const user = userEvent.setup()
    const first = renderApp()
    await openSettings(user)
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    first.unmount()
    root().removeAttribute('data-theme')

    renderApp()

    expect(root()).toHaveAttribute('data-theme', 'dark')
  })
})
