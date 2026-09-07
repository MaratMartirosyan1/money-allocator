import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import type { UserEvent } from '@testing-library/user-event'
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

/**
 * Opens the settings popover. The language and theme pickers live behind the
 * gear, so anything reaching for them has to go through here first.
 *
 * `name` is a parameter because the gear's label is itself translated — a test
 * that has already switched to Russian is looking for "Настройки".
 */
export async function openSettings(
  user: UserEvent,
  name: string | RegExp = 'Settings',
): Promise<void> {
  await user.click(screen.getByRole('button', { name }))
}
