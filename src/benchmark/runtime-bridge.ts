export const M5_RUNTIME_BRIDGE_KEY = '__M5_WEAPP_RUNTIME_BRIDGE__'

export interface M5RuntimeBridge {
  readonly kind: 'formal-smoke' | 'catalog-100'
  readonly snapshot: () => Readonly<Record<string, unknown>>
  readonly invoke: (action: string, first?: string, second?: string) => void
}

type M5RuntimeGlobal = typeof globalThis & {
  [M5_RUNTIME_BRIDGE_KEY]?: M5RuntimeBridge
}

const runtimeConsoleErrors: string[] = []
let consoleErrorHookInstalled = false

export function getM5RuntimeConsoleErrors(): readonly string[] {
  return runtimeConsoleErrors
}

export function installM5RuntimeBridge(bridge: M5RuntimeBridge): () => void {
  const runtimeGlobal = globalThis as M5RuntimeGlobal
  if (!consoleErrorHookInstalled) {
    const originalConsoleError = console.error.bind(console)
    console.error = (...values: unknown[]) => {
      runtimeConsoleErrors.push(values.map((value) => String(value)).join(' '))
      originalConsoleError(...values)
    }
    consoleErrorHookInstalled = true
  }
  runtimeGlobal[M5_RUNTIME_BRIDGE_KEY] = bridge
  return () => {
    if (runtimeGlobal[M5_RUNTIME_BRIDGE_KEY] === bridge) {
      delete runtimeGlobal[M5_RUNTIME_BRIDGE_KEY]
    }
  }
}
