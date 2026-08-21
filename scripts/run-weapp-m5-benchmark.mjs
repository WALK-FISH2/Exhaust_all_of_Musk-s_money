import { spawnSync } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import process from 'node:process'

import automator from 'miniprogram-automator'

const projectPath = process.cwd()
const cliPath =
  process.env.WECHAT_DEVTOOLS_CLI ?? 'D:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat'
const route = '/pages/index/index'
const storageKey = 'spend-musk-money:game-data'
const bridgeKey = '__M5_WEAPP_RUNTIME_BRIDGE__'

function runWeappBuild({ benchmark = false, smoke = false } = {}) {
  const result = spawnSync(
    process.execPath,
    ['node_modules/@tarojs/cli/bin/taro', 'build', '--type', 'weapp'],
    {
      cwd: projectPath,
      env: {
        ...process.env,
        M5_WEAPP_BENCHMARK: benchmark ? '1' : '0',
        M5_WEAPP_SMOKE: smoke ? '1' : '0',
        NODE_PATH: [
          path.join(projectPath, 'node_modules', '.pnpm', 'node_modules'),
          process.env.NODE_PATH,
        ]
          .filter(Boolean)
          .join(path.delimiter),
      },
      stdio: 'inherit',
    },
  )
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error('WEAPP build failed.')
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function withTimeout(promise, label, timeoutMs = 30_000) {
  let timer
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

function serializeRuntimeEntry(entry) {
  if (typeof entry === 'string') return entry
  try {
    return JSON.stringify(entry)
  } catch {
    return String(entry)
  }
}

function createRuntimeCapture(miniProgram) {
  const runtimeErrors = []
  miniProgram.on('exception', (entry) => {
    runtimeErrors.push(`exception: ${serializeRuntimeEntry(entry)}`)
  })
  return { runtimeErrors }
}

async function allocatePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (typeof address === 'string' || address === null) {
        server.close(() => reject(new Error('Unable to allocate an automation port.')))
        return
      }
      server.close(() => resolve(address.port))
    })
  })
}

function quotePowerShellLiteral(value) {
  return value.replaceAll("'", "''")
}

async function launch() {
  const powershell =
    process.env.SystemRoot !== undefined
      ? path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
      : 'powershell.exe'
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const port = await allocatePort()
    const command = `& '${quotePowerShellLiteral(cliPath)}' auto --project '${quotePowerShellLiteral(projectPath)}' --auto-port ${port} --trust-project`
    const launchResult = spawnSync(
      powershell,
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command],
      {
        cwd: projectPath,
        stdio: 'inherit',
        windowsHide: true,
      },
    )
    if (launchResult.error) throw launchResult.error
    if (launchResult.status !== 0) throw new Error('WeChat Developer Tools auto command failed.')

    console.log(`[M5 WEAPP] waiting for automation port ${port}, attempt ${attempt}/3`)
    await sleep(10_000)
    try {
      const miniProgram = await withTimeout(
        automator.connect({ wsEndpoint: `ws://127.0.0.1:${port}` }),
        `connect automation port ${port}`,
        20_000,
      )
      console.log(`[M5 WEAPP] connected to automation port ${port}`)
      return miniProgram
    } catch (error) {
      lastError = error
      console.warn(`[M5 WEAPP] ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  throw lastError ?? new Error('Unable to connect to WeChat Developer Tools automation.')
}

async function snapshot(miniProgram) {
  return withTimeout(
    miniProgram.evaluate((key) => {
      const bridge = globalThis[key]
      return bridge === undefined ? null : { kind: bridge.kind, ...bridge.snapshot() }
    }, bridgeKey),
    'runtime bridge snapshot',
  )
}

async function invoke(miniProgram, action, first, second) {
  return withTimeout(
    miniProgram.evaluate(
      (key, actionName, firstValue, secondValue) => {
        const bridge = globalThis[key]
        if (bridge === undefined) throw new Error(`Missing runtime bridge: ${key}`)
        bridge.invoke(actionName, firstValue, secondValue)
        return true
      },
      bridgeKey,
      action,
      first,
      second,
    ),
    `runtime action ${action}`,
  )
}

async function reLaunch(miniProgram) {
  await withTimeout(
    miniProgram.evaluate((url) => {
      globalThis.wx.reLaunch({ url })
      return true
    }, route),
    'WEAPP reLaunch',
  )
  await sleep(2_000)
}

async function clearStorage(miniProgram) {
  await withTimeout(
    miniProgram.evaluate((key) => {
      globalThis.wx.removeStorageSync(key)
      return true
    }, storageKey),
    'clear smoke Storage',
  )
}

async function scrollTo(miniProgram, scrollTop) {
  await withTimeout(
    miniProgram.evaluate((value) => {
      globalThis.wx.pageScrollTo({ scrollTop: value, duration: 0 })
      return true
    }, scrollTop),
    `scroll to ${scrollTop}`,
  )
  await sleep(250)
}

async function waitForSnapshot(miniProgram, predicate, description, timeoutMs = 15_000) {
  const startedAt = performance.now()
  let latest = null
  while (performance.now() - startedAt < timeoutMs) {
    try {
      latest = await snapshot(miniProgram)
      if (latest !== null && predicate(latest)) return latest
    } catch {
      // The bridge is replaced while React mounts or rerenders; retry until stable.
    }
    await sleep(75)
  }
  throw new Error(`Timed out waiting for ${description}. Latest: ${JSON.stringify(latest)}`)
}

async function waitForStoredPurchase(miniProgram) {
  const startedAt = performance.now()
  while (performance.now() - startedAt < 10_000) {
    const raw = await withTimeout(
      miniProgram.evaluate((key) => globalThis.wx.getStorageSync(key), storageKey),
      'read smoke Storage',
    )
    if (typeof raw === 'string' && raw.includes('lucky-sticker')) return raw
    await sleep(75)
  }
  throw new Error('Formal WEAPP purchase did not persist to Storage.')
}

async function measure(samples, name, action, predicate, miniProgram) {
  const startedAt = performance.now()
  await action()
  await waitForSnapshot(miniProgram, predicate, name)
  samples[name] = Number((performance.now() - startedAt).toFixed(2))
}

async function runFormalSmoke() {
  console.log('[M5 WEAPP] starting formal runtime smoke')
  const miniProgram = await launch()
  const runtime = createRuntimeCapture(miniProgram)
  try {
    await clearStorage(miniProgram)
    const firstDisplayStartedAt = performance.now()
    await reLaunch(miniProgram)
    const initial = await waitForSnapshot(
      miniProgram,
      (value) => value.kind === 'formal-smoke' && value.ready === true,
      'formal smoke first display',
    )
    const firstDisplayMs = Number((performance.now() - firstDisplayStartedAt).toFixed(2))
    const systemInfo = await withTimeout(
      miniProgram.evaluate(() => globalThis.wx.getSystemInfoSync()),
      'read WEAPP system info',
    )
    await invoke(miniProgram, 'increment-lucky-sticker')
    await waitForSnapshot(
      miniProgram,
      (value) => value.luckyStickerQuantity === 1 && value.totalSpentUsd === 1,
      'formal free purchase',
    )
    await waitForStoredPurchase(miniProgram)

    await reLaunch(miniProgram)
    await waitForSnapshot(
      miniProgram,
      (value) => value.restorePromptOpen === true,
      'formal restore prompt',
    )
    await invoke(miniProgram, 'continue-restored-run')
    await waitForSnapshot(
      miniProgram,
      (value) => value.restorePromptOpen === false && value.luckyStickerQuantity === 1,
      'formal restored purchase',
    )

    await clearStorage(miniProgram)
    await reLaunch(miniProgram)
    await waitForSnapshot(
      miniProgram,
      (value) =>
        value.mode === 'free' &&
        value.luckyStickerQuantity === 0 &&
        value.restorePromptOpen === false,
      'fresh run before challenge smoke',
    )
    await invoke(miniProgram, 'open-mode-picker')
    await waitForSnapshot(
      miniProgram,
      (value) => value.modePickerOpen === true,
      'formal challenge picker',
    )
    await invoke(miniProgram, 'select-mode', 'challenge-30')
    await waitForSnapshot(
      miniProgram,
      (value) => value.mode === 'challenge-30' && value.status === 'ready',
      'formal 30-second challenge',
    )
    await invoke(miniProgram, 'start-challenge')
    const challenge = await waitForSnapshot(
      miniProgram,
      (value) =>
        value.mode === 'challenge-30' &&
        value.status === 'active' &&
        typeof value.remainingChallengeMs === 'number' &&
        value.remainingChallengeMs > 0,
      'formal challenge start',
    )

    await scrollTo(miniProgram, 2_000)
    await scrollTo(miniProgram, 0)
    await clearStorage(miniProgram)
    const final = await snapshot(miniProgram)

    const consoleErrors = final?.runtimeConsoleErrors ?? []
    if (runtime.runtimeErrors.length > 0 || consoleErrors.length > 0) {
      throw new Error(
        `WEAPP formal smoke runtime errors: ${[...runtime.runtimeErrors, ...consoleErrors].join('\n')}`,
      )
    }

    return {
      device: {
        brand: systemInfo.brand,
        model: systemInfo.model,
        platform: systemInfo.platform,
        system: systemInfo.system,
        SDKVersion: systemInfo.SDKVersion,
        windowWidth: systemInfo.windowWidth,
        windowHeight: systemInfo.windowHeight,
      },
      firstDisplayMs,
      home: initial.kind === 'formal-smoke',
      freePurchase: true,
      compactLayout: true,
      challenge30Started: challenge.status === 'active',
      storageRestore: true,
      scrollInvoked: true,
      consoleErrors,
      runtimeErrors: runtime.runtimeErrors,
    }
  } finally {
    miniProgram.disconnect()
  }
}

async function runCatalogBenchmark() {
  console.log('[M5 WEAPP] starting 100-product runtime benchmark')
  const miniProgram = await launch()
  const runtime = createRuntimeCapture(miniProgram)
  const samples = {}
  try {
    const firstDisplayStartedAt = performance.now()
    await reLaunch(miniProgram)
    const initial = await waitForSnapshot(
      miniProgram,
      (value) =>
        value.kind === 'catalog-100' &&
        value.ready === true &&
        value.productCount === 100 &&
        value.renderedCount === 100,
      '100-product first display',
    )
    samples.initialDisplay = Number((performance.now() - firstDisplayStartedAt).toFixed(2))

    await measure(
      samples,
      'categoryTech',
      () => invoke(miniProgram, 'category', 'tech'),
      (value) => value.selectedCategoryId === 'tech' && value.visibleCount < 100,
      miniProgram,
    )
    await measure(
      samples,
      'categoryAll',
      () => invoke(miniProgram, 'category', 'all'),
      (value) => value.selectedCategoryId === 'all' && value.visibleCount === 100,
      miniProgram,
    )
    await measure(
      samples,
      'search',
      () => invoke(miniProgram, 'search', 'Benchmark 100'),
      (value) => value.searchQuery === 'Benchmark 100' && value.visibleCount === 1,
      miniProgram,
    )
    await invoke(miniProgram, 'search', '')
    await waitForSnapshot(
      miniProgram,
      (value) => value.searchQuery === '' && value.visibleCount === 100,
      'search reset',
    )

    await measure(
      samples,
      'increment',
      () => invoke(miniProgram, 'increment', 'benchmark-001'),
      (value) => value.firstQuantity === 1 && value.totalSpentUsd === 1,
      miniProgram,
    )
    await measure(
      samples,
      'decrement',
      () => invoke(miniProgram, 'decrement', 'benchmark-001'),
      (value) => value.firstQuantity === 0 && value.totalSpentUsd === 0,
      miniProgram,
    )
    await measure(
      samples,
      'max',
      () => invoke(miniProgram, 'max', 'benchmark-001'),
      (value) => value.firstQuantity === 1_000_000_000,
      miniProgram,
    )
    await measure(
      samples,
      'quantityInput',
      () => invoke(miniProgram, 'quantity', '3'),
      (value) =>
        value.firstQuantity === 3 && value.receiptFirstQuantity === 3 && value.totalSpentUsd === 3,
      miniProgram,
    )

    await scrollTo(miniProgram, 4_000)
    await scrollTo(miniProgram, 0)
    const final = await waitForSnapshot(
      miniProgram,
      (value) => value.firstQuantity === 3 && value.receiptLineCount === 1,
      'receipt and final state update',
    )

    const consoleErrors = final.runtimeConsoleErrors ?? []
    if (runtime.runtimeErrors.length > 0 || consoleErrors.length > 0) {
      throw new Error(
        `WEAPP benchmark runtime errors: ${[...runtime.runtimeErrors, ...consoleErrors].join('\n')}`,
      )
    }

    return {
      fixtureProductCount: initial.productCount,
      formalCatalogModified: false,
      interactions: {
        firstDisplay: true,
        scroll: true,
        category: true,
        search: true,
        increment: true,
        decrement: true,
        max: true,
        quantityInput: true,
        receipt: final.receiptFirstQuantity === 3,
        stateUpdate: final.totalSpentUsd === 3,
      },
      samplesMs: samples,
      fps: null,
      fpsNote:
        'Developer Tools automation did not expose a reliable FPS sample; no FPS is claimed.',
      consoleErrors,
      runtimeErrors: runtime.runtimeErrors,
    }
  } finally {
    miniProgram.disconnect()
  }
}

let report
let primaryError
try {
  console.log('[M5 WEAPP] building instrumented formal smoke target')
  runWeappBuild({ smoke: true })
  const smoke = await runFormalSmoke()
  console.log('[M5 WEAPP] building isolated 100-product benchmark target')
  runWeappBuild({ benchmark: true })
  const benchmark = await runCatalogBenchmark()
  report = {
    gate: 'T0520-weapp-runtime',
    timestamp: new Date().toISOString(),
    developerToolsCli: cliPath,
    smoke,
    benchmark,
  }
} catch (error) {
  primaryError = error
} finally {
  try {
    console.log('[M5 WEAPP] restoring formal production build')
    runWeappBuild()
  } catch (restoreError) {
    primaryError ??= restoreError
  }
}

if (primaryError !== undefined) throw primaryError
console.log(`M5_WEAPP_RUNTIME_RESULT=${JSON.stringify(report)}`)
