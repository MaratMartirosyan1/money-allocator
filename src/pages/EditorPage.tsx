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
          <div className="app__side-inner">
            <PayoutSummary />
            <IssueList />
          </div>
        </aside>
      </main>
    </div>
  )
}
