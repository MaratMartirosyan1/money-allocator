import { useLayoutEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { AllocatorCanvas } from '../components/AllocatorCanvas'
import { IssueList } from '../components/IssueList'
import { PayoutSummary } from '../components/PayoutSummary'
import { SIDEBAR_ID, TopBar } from '../components/TopBar'
import { useAllocatorStore } from '../store/useAllocatorStore'

/** One diagram, open for editing. The URL owns which one. */
export function EditorPage() {
  const { systemId } = useParams()
  const exists = useAllocatorStore((s) =>
    Boolean(systemId && s.systems[systemId]),
  )
  const activeSystemId = useAllocatorStore((s) => s.activeSystemId)
  const selectSystem = useAllocatorStore((s) => s.selectSystem)
  const sidebarOpen = useAllocatorStore((s) => s.sidebarOpen)
  const toggleSidebar = useAllocatorStore((s) => s.toggleSidebar)

  // The store's actions all operate on the open diagram, so the URL is pushed
  // into it here. A layout effect means the mismatched commit below is never
  // painted.
  useLayoutEffect(() => {
    if (systemId && exists) selectSystem(systemId)
  }, [systemId, exists, selectSystem])

  // A stale or hand-typed link — nothing to open.
  if (!systemId || !exists) return <Navigate to="/" replace />
  if (activeSystemId !== systemId) return null

  return (
    <div className="app">
      <TopBar />
      <main className="app__body">
        <div className="app__canvas">
          <AllocatorCanvas />
        </div>
        {/*
          The panel stays mounted so it can slide, and `inert` keeps its
          controls out of the tab order and the accessibility tree while it is
          collapsed. React Flow notices the canvas resize on its own.
        */}
        <aside
          id={SIDEBAR_ID}
          className={`app__side ${sidebarOpen ? 'is-open' : 'is-closed'}`}
          inert={!sidebarOpen}
        >
          {/*
            On a phone the panel is a bottom sheet, and a sheet needs a grab
            bar to read as one — swiping or tapping it closes the sheet without
            reaching back up to the top bar.

            It is deliberately kept out of the accessibility tree: it is a
            redundant pointer affordance for the hamburger, which already
            exposes this action with `aria-controls`. Announcing two "hide
            panels" buttons would be worse than announcing one.
          */}
          <button
            type="button"
            className="app__side-handle"
            tabIndex={-1}
            aria-hidden="true"
            onClick={toggleSidebar}
          >
            <span className="app__side-grip" />
          </button>
          <div className="app__side-inner">
            <PayoutSummary />
            <IssueList />
          </div>
        </aside>
      </main>
    </div>
  )
}
