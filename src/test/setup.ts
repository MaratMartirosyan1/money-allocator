import '@testing-library/jest-dom/vitest'

/**
 * React Flow measures its container and nodes through browser APIs that jsdom
 * does not implement. These are the shims React Flow documents for testing;
 * they only affect the test environment.
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

class DOMMatrixReadOnlyStub {
  m22 = 1
  constructor(transform?: string) {
    const scale = transform?.match(/scale\(([\d.]+)\)/)
    if (scale?.[1]) this.m22 = Number(scale[1])
  }
}

globalThis.DOMMatrixReadOnly ??=
  DOMMatrixReadOnlyStub as unknown as typeof DOMMatrixReadOnly

// Give every element a non-zero box so React Flow considers nodes measurable.
if (!Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')?.get) {
  Object.defineProperties(HTMLElement.prototype, {
    offsetHeight: { get: () => 220 },
    offsetWidth: { get: () => 248 },
  })
}

const svgProto = globalThis.SVGElement.prototype as unknown as {
  getBBox?: () => DOMRect
}
svgProto.getBBox ??= () =>
  ({ x: 0, y: 0, width: 248, height: 220 }) as DOMRect
