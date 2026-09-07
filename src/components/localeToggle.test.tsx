import { beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createInitialState,
  useAllocatorStore,
} from '../store/useAllocatorStore'
import { editorRoute, renderApp } from '../test/renderApp'

const store = () => useAllocatorStore.getState()

beforeEach(() => {
  localStorage.clear()
  useAllocatorStore.setState(createInitialState())
  document.documentElement.lang = ''
})

describe('the language toggle', () => {
  it('starts on English, matching the test environment locale', () => {
    renderApp()

    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('labels each language in that language', () => {
    renderApp()

    // Someone who has landed on the wrong language cannot read the others, so
    // the options are never translated.
    expect(screen.getByRole('button', { name: 'Русский' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Հայերեն' })).toBeInTheDocument()
  })

  it('retranslates the list page when the language changes', async () => {
    const user = userEvent.setup()
    renderApp()

    expect(screen.getByRole('heading', { name: 'Diagrams' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Русский' }))

    expect(store().locale).toBe('ru')
    expect(screen.getByRole('heading', { name: 'Схемы' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Diagrams' })).toBeNull()
  })

  it('reflects the language onto <html lang> for screen readers', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Հայերեն' }))
    expect(document.documentElement.lang).toBe('hy')

    await user.click(screen.getByRole('button', { name: 'English' }))
    expect(document.documentElement.lang).toBe('en')
  })

  it('translates the editor, including the engine’s own messages', async () => {
    const user = userEvent.setup()
    useAllocatorStore.setState({ income: 1_000_000 })
    renderApp(editorRoute(store().activeSystemId))

    expect(screen.getByText('Everything adds up.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Русский' }))

    expect(screen.getByText('Всё сходится.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Выплаты' })).toBeInTheDocument()
  })

  it('formats money and issue text in the chosen language', async () => {
    const user = userEvent.setup()

    // Charity 10% + Savings 10% + Living auto → drop Living so 80% strands.
    const living = Object.values(store().systems[store().activeSystemId]!.nodes)
      .find((n) => n.name === 'Living')
    store().removeNode(living!.id)
    useAllocatorStore.setState({ income: 1_000_000 })

    renderApp(editorRoute(store().activeSystemId))
    expect(screen.getByText(/stays unallocated/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Русский' }))

    expect(screen.getByText(/не распределены/)).toBeInTheDocument()
    // Russian groups thousands with a space, not a comma. `Intl.NumberFormat`
    // was previously being called with `undefined` — the *browser's* locale
    // rather than the app's — so this is the assertion that would have caught
    // that.
    const payouts = within(
      screen.getByRole('heading', { name: 'Выплаты' }).closest('section') as HTMLElement,
    )
    expect(payouts.getAllByText(/100\s000/).length).toBeGreaterThan(0)
    expect(payouts.queryByText(/100,000/)).toBeNull()
  })

  it('survives a reload, because the choice is persisted', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Հայերեն' }))

    const saved = JSON.parse(localStorage.getItem('mny-allocator') ?? '{}')
    expect(saved.state.locale).toBe('hy')
  })
})
