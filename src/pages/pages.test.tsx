import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createInitialState,
  useAllocatorStore,
} from '../store/useAllocatorStore'
import { editorRoute, renderApp } from '../test/renderApp'

const store = () => useAllocatorStore.getState()
const cardFor = (name: string) => {
  const item = screen.getByLabelText(`Name of ${name}`).closest('li')
  if (!item) throw new Error(`no card for ${name}`)
  return item
}

beforeEach(() => {
  localStorage.clear()
  useAllocatorStore.setState(createInitialState())
  vi.restoreAllMocks()
})

describe('the diagrams list page', () => {
  it('is what "/" shows', () => {
    renderApp()

    expect(screen.getByRole('heading', { name: 'Diagrams' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name of My allocation')).toBeInTheDocument()
  })

  it('summarises each diagram', () => {
    renderApp()
    const card = cardFor('My allocation')

    expect(
      within(card).getByText('Charity 10% · Savings 10% · Living auto'),
    ).toBeInTheDocument()
    expect(within(card).getByText('3 accounts · 4 nodes')).toBeInTheDocument()
  })

  it('says the work is already saved rather than offering a save button', () => {
    renderApp()

    expect(within(cardFor('My allocation')).getByText(/^Saved · edited/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Save$/ })).not.toBeInTheDocument()
  })

  it('opens a diagram from its Open link', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(within(cardFor('My allocation')).getByRole('link', { name: 'Open' }))

    expect(screen.getByLabelText('Diagram name')).toHaveValue('My allocation')
    expect(screen.getByRole('heading', { name: 'Payouts' })).toBeInTheDocument()
  })

  it('creates a diagram and drops straight into its editor', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: '+ New diagram' }))

    expect(screen.getByLabelText('Diagram name')).toHaveValue('Allocation')
    expect(store().systemOrder).toHaveLength(2)
  })

  it('renames a diagram in place', async () => {
    const user = userEvent.setup()
    renderApp()

    const name = screen.getByLabelText('Name of My allocation')
    await user.clear(name)
    await user.type(name, 'Household')

    expect(store().systems[store().activeSystemId]?.name).toBe('Household')
  })

  it('duplicates a diagram, staying on the list', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Duplicate My allocation' }))

    expect(screen.getByRole('heading', { name: 'Diagrams' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name of My allocation copy')).toBeInTheDocument()
  })

  it('deletes a diagram once confirmed', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    store().createSystem('Business')
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Delete Business' }))

    expect(screen.queryByLabelText('Name of Business')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Name of My allocation')).toBeInTheDocument()
  })

  it('keeps the diagram when the confirmation is declined', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Delete My allocation' }))

    expect(screen.getByLabelText('Name of My allocation')).toBeInTheDocument()
  })

  it('shows an empty state once every diagram is gone', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Delete My allocation' }))

    expect(screen.getByText('No diagrams yet')).toBeInTheDocument()
    expect(store().systemOrder).toEqual([])
  })

  it('creates the first diagram from the empty state', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Delete My allocation' }))
    await user.click(screen.getByRole('button', { name: '+ New diagram' }))

    expect(screen.getByLabelText('Diagram name')).toBeInTheDocument()
    expect(store().systemOrder).toHaveLength(1)
  })
})

describe('the editor page', () => {
  it('opens the diagram named in the URL, not whichever was last active', () => {
    const first = store().activeSystemId
    store().createSystem('Business')

    renderApp(editorRoute(first))

    expect(screen.getByLabelText('Diagram name')).toHaveValue('My allocation')
    expect(store().activeSystemId).toBe(first)
  })

  it('goes back to the list from the back button', async () => {
    const user = userEvent.setup()
    renderApp(editorRoute(store().activeSystemId))

    await user.click(screen.getByRole('link', { name: /Diagrams/ }))

    expect(screen.getByRole('heading', { name: 'Diagrams' })).toBeInTheDocument()
  })

  it('sends an unknown diagram id back to the list', () => {
    renderApp('/d/does-not-exist')

    expect(screen.getByRole('heading', { name: 'Diagrams' })).toBeInTheDocument()
  })

  it('sends an unknown route back to the list', () => {
    renderApp('/nonsense')

    expect(screen.getByRole('heading', { name: 'Diagrams' })).toBeInTheDocument()
  })

  it('survives the open diagram being deleted elsewhere', () => {
    const id = store().activeSystemId
    const { rerender } = renderApp(editorRoute(id))
    expect(screen.getByLabelText('Diagram name')).toBeInTheDocument()

    store().deleteSystem(id)
    rerender(<div />)

    expect(screen.queryByLabelText('Diagram name')).not.toBeInTheDocument()
  })

  it('keeps each diagram\'s edits to itself across a round trip', async () => {
    const user = userEvent.setup()
    const first = store().activeSystemId
    renderApp()

    // Make a new diagram and rename one of its nodes.
    await user.click(screen.getByRole('button', { name: '+ New diagram' }))
    const [firstNode] = screen.getAllByLabelText('Node name')
    if (!firstNode) throw new Error('no node')
    await user.clear(firstNode)
    await user.type(firstNode, 'Zakat')

    // Back to the list, then into the original.
    await user.click(screen.getByRole('link', { name: /Diagrams/ }))
    await user.click(
      within(cardFor('My allocation')).getByRole('link', { name: 'Open' }),
    )

    expect(store().activeSystemId).toBe(first)
    const names = screen
      .getAllByLabelText('Node name')
      .map((el) => (el as HTMLInputElement).value)
    expect(names).toEqual(['Charity', 'Savings', 'Living'])
  })
})
