import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInitialState, useAllocatorStore } from './store/useAllocatorStore'
import { editorRoute, renderApp } from './test/renderApp'

beforeEach(() => {
  localStorage.clear()
  useAllocatorStore.setState(createInitialState())
  if (!useAllocatorStore.getState().sidebarOpen) {
    useAllocatorStore.getState().toggleSidebar()
  }
})

const openEditor = () =>
  renderApp(editorRoute(useAllocatorStore.getState().activeSystemId))

describe('the editor page', () => {
  it('mounts the canvas, the payout panel and the checks panel', () => {
    openEditor()

    expect(screen.getByLabelText('Diagram name')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Payouts' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Checks' })).toBeInTheDocument()
  })

  it('offers "Tidy up" only once a node has been dragged', () => {
    const first = openEditor()
    expect(screen.queryByRole('button', { name: 'Tidy up' })).not.toBeInTheDocument()
    first.unmount()

    const store = useAllocatorStore.getState()
    const system = store.systems[store.activeSystemId]
    const moved = system?.nodes[system.rootId]?.childIds[0]
    if (!moved) throw new Error('no child to move')
    store.setNodePosition(moved, { x: 400, y: 400 })

    openEditor()
    expect(screen.getByRole('button', { name: 'Tidy up' })).toBeInTheDocument()
  })

  it('renders every tree node onto the canvas', () => {
    openEditor()

    // Root plus the three starter children.
    expect(screen.getAllByLabelText('Node name')).toHaveLength(3)
    expect(screen.getByLabelText('Root node name')).toBeInTheDocument()
  })
})

describe('the sidebar toggle', () => {
  const toggle = () => screen.getByRole('button', { name: /panels/i })
  const sidebar = () => {
    const el = document.getElementById('side-panels')
    if (!el) throw new Error('no sidebar')
    return el
  }

  it('starts open, with the toggle reflecting that', () => {
    openEditor()

    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    expect(toggle()).toHaveAccessibleName('Hide panels')
    expect(sidebar()).toHaveClass('is-open')
  })

  it('collapses and reopens on click', async () => {
    const user = userEvent.setup()
    openEditor()

    await user.click(toggle())

    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(toggle()).toHaveAccessibleName('Show panels')
    expect(sidebar()).toHaveClass('is-closed')

    await user.click(toggle())

    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    expect(sidebar()).toHaveClass('is-open')
  })

  it('makes the collapsed panel inert, keeping its controls untabbable', async () => {
    const user = userEvent.setup()
    openEditor()

    expect(sidebar()).not.toHaveAttribute('inert')
    await user.click(toggle())
    expect(sidebar()).toHaveAttribute('inert')
  })

  it('points the toggle at the region it controls', () => {
    openEditor()
    expect(toggle()).toHaveAttribute('aria-controls', 'side-panels')
    expect(sidebar().id).toBe('side-panels')
  })

  it('keeps the panels mounted so they can slide', async () => {
    const user = userEvent.setup()
    openEditor()

    await user.click(toggle())

    // Still in the DOM — collapsed, not unmounted.
    expect(screen.getByRole('heading', { name: 'Payouts' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Checks' })).toBeInTheDocument()
  })

  it('remembers the preference across a remount', async () => {
    const user = userEvent.setup()
    const first = openEditor()
    await user.click(toggle())
    first.unmount()

    openEditor()

    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(sidebar()).toHaveClass('is-closed')
  })
})
