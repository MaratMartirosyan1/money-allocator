import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import App from '../App'

/** Renders the whole app at a given route, the way the browser would. */
export function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
}

/** Renders a bare component under a router, for component-level tests. */
export function renderRouted(ui: ReactElement, route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>,
  )
}

/** The route for the diagram that is currently open in the store. */
export function editorRoute(systemId: string) {
  return `/d/${systemId}`
}
