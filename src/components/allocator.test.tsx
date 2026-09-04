import { beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactFlowProvider, type NodeProps } from '@xyflow/react'
import { getChildren } from '../domain/tree'
import type { FlowNode } from '../layout/treeLayout'
import { createInitialState, useAllocatorStore } from '../store/useAllocatorStore'
import { AllocationNode } from './nodes/AllocationNode'
import { RootNode } from './nodes/RootNode'
import { PayoutSummary } from './PayoutSummary'
import { IssueList } from './IssueList'
import { TopBar } from './TopBar'
import { renderRouted } from '../test/renderApp'

const store = () => useAllocatorStore.getState()
const system = () => {
  const s = store()
  const found = s.systems[s.activeSystemId]
  if (!found) throw new Error('no active system')
  return found
}

/** AllocationNode only reads `data`, so a minimal stand-in is enough. */
function nodeProps(nodeId: string): NodeProps<FlowNode> {
  return { data: { nodeId, isRoot: false } } as unknown as NodeProps<FlowNode>
}

/** The node components render React Flow `Handle`s, which need the provider. */
function Harness({ nodeId }: { nodeId?: string }) {
  return (
    <ReactFlowProvider>
      <TopBar />
      <RootNode />
      {nodeId ? <AllocationNode {...nodeProps(nodeId)} /> : null}
      <PayoutSummary />
      <IssueList />
    </ReactFlowProvider>
  )
}

function payoutRow(name: string): HTMLElement {
  const cell = screen.getByText(name)
  const row = cell.closest('tr')
  if (!row) throw new Error(`no payout row for ${name}`)
  return row
}

beforeEach(() => {
  localStorage.clear()
  useAllocatorStore.setState(createInitialState())
  store().setIncome(0)
})

describe('the starter tree', () => {
  it('renders the root with its named children', () => {
    renderRouted(<Harness />)

    expect(screen.getByLabelText('Root node name')).toHaveValue('Monthly income')
    expect(payoutRow('Charity')).toBeInTheDocument()
    expect(payoutRow('Savings')).toBeInTheDocument()
    expect(payoutRow('Living')).toBeInTheDocument()
  })

  it('reports no problems', () => {
    renderRouted(<Harness />)
    expect(screen.getByText('Everything adds up.')).toBeInTheDocument()
  })

  it('splits a typed income 10 / 10 / 80', async () => {
    const user = userEvent.setup()
    renderRouted(<Harness />)

    const [incomeInput] = screen.getAllByLabelText('Monthly income')
    if (!incomeInput) throw new Error('no income input')
    await user.type(incomeInput, '1000000')

    expect(within(payoutRow('Charity')).getByText(/100,000/)).toBeInTheDocument()
    expect(within(payoutRow('Savings')).getByText(/100,000/)).toBeInTheDocument()
    expect(within(payoutRow('Living')).getByText(/800,000/)).toBeInTheDocument()
  })

  it('shows the auto node deriving 80% before any income is entered', () => {
    const living = getChildren(system(), system().rootId).find(
      (c) => c.mode === 'auto',
    )
    if (!living) throw new Error('no auto child')

    renderRouted(<Harness nodeId={living.id} />)

    const note = screen.getByText('Takes the remainder').closest('.auto-note')
    if (!note) throw new Error('no auto note')
    expect(within(note as HTMLElement).getByText('80%')).toBeInTheDocument()
  })
})

describe('editing a node', () => {
  it('renames it and the payout table follows', async () => {
    const user = userEvent.setup()
    const charity = getChildren(system(), system().rootId)[0]
    if (!charity) throw new Error('no child')

    renderRouted(<Harness nodeId={charity.id} />)

    const nameInput = screen.getByLabelText('Node name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Tithe')

    expect(payoutRow('Tithe')).toBeInTheDocument()
  })

  it('recalculates the auto sibling when a percentage changes', async () => {
    const user = userEvent.setup()
    store().setIncome(1_000_000)
    const charity = getChildren(system(), system().rootId)[0]
    if (!charity) throw new Error('no child')

    renderRouted(<Harness nodeId={charity.id} />)

    const share = screen.getByLabelText('Percentage share')
    await user.clear(share)
    await user.type(share, '30')

    expect(within(payoutRow('Charity')).getByText(/300,000/)).toBeInTheDocument()
    expect(within(payoutRow('Living')).getByText(/600,000/)).toBeInTheDocument()
  })

  it('clamps a percentage to the group headroom as it is typed', async () => {
    const user = userEvent.setup()
    const charity = getChildren(system(), system().rootId)[0]
    if (!charity) throw new Error('no child')

    renderRouted(<Harness nodeId={charity.id} />)

    const share = screen.getByLabelText('Percentage share')
    await user.clear(share)
    await user.type(share, '150')

    // Savings still holds 10%, so 90 is the ceiling.
    expect(system().nodes[charity.id]?.value).toBe(90)
    expect(share).toHaveValue('90')
  })

  it('switches to a fixed amount and takes it off the top', async () => {
    const user = userEvent.setup()
    store().setIncome(1_000_000)
    const charity = getChildren(system(), system().rootId)[0]
    if (!charity) throw new Error('no child')

    renderRouted(<Harness nodeId={charity.id} />)

    await user.click(screen.getByRole('button', { name: 'Fixed' }))
    await user.type(screen.getByLabelText('Fixed amount'), '250000')

    expect(system().nodes[charity.id]?.mode).toBe('fixed')
    expect(within(payoutRow('Charity')).getByText(/250,000/)).toBeInTheDocument()
    // Savings keeps its 10% of the full income; Living absorbs the rest.
    expect(within(payoutRow('Savings')).getByText(/100,000/)).toBeInTheDocument()
    expect(within(payoutRow('Living')).getByText(/650,000/)).toBeInTheDocument()
  })
})

describe('the brief, end to end', () => {
  it('adds a fixed 300,000 child and routes the remainder to its auto sibling', async () => {
    const user = userEvent.setup()
    store().setIncome(1_000_000)

    const living = getChildren(system(), system().rootId).find(
      (c) => c.mode === 'auto',
    )
    if (!living) throw new Error('no auto child')

    // First child of Living arrives as `auto` and holds all 800,000.
    const rent = store().addChild(living.id)
    if (!rent) throw new Error('addChild failed')
    store().renameNode(rent, 'Rent')

    // Second child comes in as a percentage; switch it to a fixed amount.
    const spendings = store().addChild(living.id)
    if (!spendings) throw new Error('addChild failed')
    store().renameNode(spendings, 'Spendings')

    renderRouted(<Harness nodeId={rent} />)

    await user.click(screen.getByRole('button', { name: 'Fixed' }))
    await user.type(screen.getByLabelText('Fixed amount'), '300000')

    expect(within(payoutRow('Rent')).getByText(/300,000/)).toBeInTheDocument()
    // Spendings is a 10% node, so it takes 10% of Living's 800,000...
    expect(within(payoutRow('Spendings')).getByText(/80,000/)).toBeInTheDocument()
    // ...and the shortfall is flagged, because nothing absorbs the rest.
    expect(screen.getByText(/unallocated/i)).toBeInTheDocument()
  })

  it('offers a one-click fix that absorbs stranded money', async () => {
    const user = userEvent.setup()
    store().setIncome(1_000_000)

    const charity = getChildren(system(), system().rootId)[0]
    const living = getChildren(system(), system().rootId).find(
      (c) => c.mode === 'auto',
    )
    if (!charity || !living) throw new Error('unexpected starter shape')

    // Turning the only auto node into a percentage strands 80%.
    store().setMode(living.id, 'percent')
    store().setValue(living.id, 10)

    renderRouted(<Harness />)
    expect(screen.getByText(/stays unallocated/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Absorb it' }))

    expect(screen.getByText('Everything adds up.')).toBeInTheDocument()
    expect(within(payoutRow('Charity')).getByText(/100,000/)).toBeInTheDocument()
  })

  it('flags a fixed amount that outruns a low income', async () => {
    const user = userEvent.setup()
    const charity = getChildren(system(), system().rootId)[0]
    if (!charity) throw new Error('no child')

    renderRouted(<Harness nodeId={charity.id} />)

    await user.click(screen.getByRole('button', { name: 'Fixed' }))
    await user.type(screen.getByLabelText('Fixed amount'), '500000')

    const [incomeInput] = screen.getAllByLabelText('Monthly income')
    if (!incomeInput) throw new Error('no income input')
    await user.type(incomeInput, '100000')

    expect(screen.getByText(/were reduced proportionally/)).toBeInTheDocument()
    // Savings' 10% comes off the full 100,000 first, so only 90,000 is left
    // for the fixed node to claim — it gets that, not the whole income.
    expect(within(payoutRow('Charity')).getByText(/90,000/)).toBeInTheDocument()
    expect(within(payoutRow('Savings')).getByText(/10,000/)).toBeInTheDocument()
  })
})

describe('the payout table', () => {
  it('always balances to the income', async () => {
    const user = userEvent.setup()
    renderRouted(<Harness />)

    const [incomeInput] = screen.getAllByLabelText('Monthly income')
    if (!incomeInput) throw new Error('no income input')
    await user.type(incomeInput, '333333')

    const totalRow = screen.getByRole('row', { name: /Total/ })
    expect(within(totalRow).getByText(/333,333/)).toBeInTheDocument()
    expect(screen.queryByText(/this is a bug/)).not.toBeInTheDocument()
  })

  it('shows a stranded row rather than losing the money', () => {
    const living = getChildren(system(), system().rootId).find(
      (c) => c.mode === 'auto',
    )
    if (!living) throw new Error('no auto child')

    store().setMode(living.id, 'percent')
    store().setValue(living.id, 10)
    store().setIncome(1_000_000)

    renderRouted(<Harness />)

    expect(screen.getByText('Unallocated')).toBeInTheDocument()
    const totalRow = screen.getByRole('row', { name: /Total/ })
    expect(within(totalRow).getByText(/1,000,000/)).toBeInTheDocument()
  })
})

describe('deleting', () => {
  it('removes a leaf and its payout row', async () => {
    const user = userEvent.setup()
    const charity = getChildren(system(), system().rootId)[0]
    if (!charity) throw new Error('no child')

    renderRouted(<Harness nodeId={charity.id} />)
    expect(payoutRow('Charity')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete node' }))

    expect(screen.queryByText('Charity')).not.toBeInTheDocument()
  })
})
