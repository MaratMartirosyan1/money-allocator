import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createInitialState,
  useAllocatorStore,
} from '../store/useAllocatorStore'
import { editorRoute, openSettings, renderApp } from '../test/renderApp'

const gear = () => screen.getByRole('button', { name: 'Settings' })
const panel = () => screen.queryByRole('dialog', { name: 'Settings' })
/** Name-agnostic, for the cases that change the language mid-test. */
const anyPanel = () => screen.queryByRole('dialog')

beforeEach(() => {
  localStorage.clear()
  useAllocatorStore.setState(createInitialState())
  document.documentElement.removeAttribute('data-theme')
})

describe('the settings menu', () => {
  it('keeps the pickers put away until asked for', async () => {
    const user = userEvent.setup()
    renderApp()

    expect(panel()).toBeNull()
    expect(screen.queryByRole('button', { name: 'Dark' })).toBeNull()
    expect(gear()).toHaveAttribute('aria-expanded', 'false')

    await openSettings(user)

    expect(panel()).toBeInTheDocument()
    expect(gear()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Dark' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Русский' })).toBeInTheDocument()
  })

  it('names each group from the caption the user can see', async () => {
    const user = userEvent.setup()
    renderApp()
    await openSettings(user)

    // The visible caption is the group's accessible name, not a second copy
    // of it — so there is exactly one "Language" in the accessibility tree.
    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument()
  })

  it('closes again on a second press of the gear', async () => {
    const user = userEvent.setup()
    renderApp()

    await openSettings(user)
    await user.click(gear())

    expect(panel()).toBeNull()
  })

  it('closes on Escape and hands focus back to the gear', async () => {
    const user = userEvent.setup()
    renderApp()
    await openSettings(user)

    await user.keyboard('{Escape}')

    expect(panel()).toBeNull()
    expect(gear()).toHaveFocus()
  })

  it('closes when the click lands somewhere else', async () => {
    const user = userEvent.setup()
    renderApp()
    await openSettings(user)

    await user.click(screen.getByRole('heading', { name: 'Diagrams' }))

    expect(panel()).toBeNull()
  })

  it('stays open while a choice is being made', async () => {
    const user = userEvent.setup()
    renderApp()
    await openSettings(user)

    // Two settings behind one trigger: closing on the first pick would make
    // the second one cost another round trip.
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    expect(panel()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Русский' }))
    // By now the popover is called "Настройки" — hence the untitled query.
    expect(anyPanel()).toBeInTheDocument()

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(useAllocatorStore.getState().locale).toBe('ru')
  })

  it('renames itself along with everything else', async () => {
    const user = userEvent.setup()
    renderApp()
    await openSettings(user)
    await user.click(screen.getByRole('button', { name: 'Русский' }))

    expect(
      screen.getByRole('button', { name: 'Настройки' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Язык' })).toBeInTheDocument()
  })

  it('is reachable from the editor too, not only the list', async () => {
    const user = userEvent.setup()
    const { activeSystemId } = useAllocatorStore.getState()
    renderApp(editorRoute(activeSystemId))

    await openSettings(user)

    expect(panel()).toBeInTheDocument()
  })

  it('does not collide with the panel toggle sitting next to it', async () => {
    const user = userEvent.setup()
    const { activeSystemId } = useAllocatorStore.getState()
    renderApp(editorRoute(activeSystemId))

    await openSettings(user)
    // The sidebar hamburger is the gear's immediate neighbour in the top bar;
    // pressing it must close the popover rather than act through it.
    await user.click(screen.getByRole('button', { name: /panels/i }))

    expect(panel()).toBeNull()
    expect(useAllocatorStore.getState().sidebarOpen).toBe(false)
  })
})
