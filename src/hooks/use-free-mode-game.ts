import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'

import {
  createFreeModeUiState,
  deriveFreeModeViewModel,
  freeModeReducer,
} from '../application/free-mode-controller'
import { createPersistedGameData, hydratePersistedGame } from '../application/game-persistence'
import { isChallengeMode, type RunMode } from '../domain/game-state'
import { SYSTEM_CLOCK, type Clock } from '../platform/clock'
import { createPlatformStorageAdapter } from '../platform/create-storage-adapter'
import { useRunLifecycle } from '../platform/use-run-lifecycle'
import { GameStorageRepository } from '../storage/repository'

function createRunIdentity(
  sequence: number,
  mode: RunMode,
  clock: Clock,
): {
  readonly runId: string
  readonly timestamp: number
} {
  const timestamp = clock.now()
  return { runId: `${mode}-${timestamp}-${sequence}`, timestamp }
}

export function useFreeModeGame(clock: Clock = SYSTEM_CLOCK) {
  const sequence = useRef(1)
  const repository = useMemo(() => new GameStorageRepository(createPlatformStorageAdapter()), [])
  const [hydrationStatus, setHydrationStatus] = useState<'loading' | 'ready'>('loading')
  const [persistenceMessage, setPersistenceMessage] = useState<string | null>(null)
  const [persistenceWritable, setPersistenceWritable] = useState(true)
  const lastSavedRevision = useRef(0)
  const suspendAutosave = useRef(false)
  const [state, dispatch] = useReducer(freeModeReducer, undefined, () => {
    const identity = createRunIdentity(sequence.current, 'free', clock)
    return createFreeModeUiState(identity.runId, identity.timestamp)
  })
  const initialRun = useRef(state.run)
  const viewModel = useMemo(() => deriveFreeModeViewModel(state), [state])
  const { run, lifetimeAchievementIds, records, preferences } = state
  const persistenceDocument = useMemo(
    () => createPersistedGameData({ run, lifetimeAchievementIds, records, preferences }),
    [lifetimeAchievementIds, preferences, records, run],
  )

  useEffect(() => {
    let cancelled = false
    void repository.load().then((loaded) => {
      if (cancelled) return
      setPersistenceWritable(loaded.writable)
      if (loaded.data !== null) {
        const progress = hydratePersistedGame(loaded.data, initialRun.current, clock.now())
        dispatch({
          type: 'hydrate',
          progress: {
            ...progress,
            requiresSave:
              progress.requiresSave ||
              loaded.status === 'recovered' ||
              loaded.status === 'migrated',
          },
        })
      }
      if (loaded.status === 'recovered' || loaded.status === 'corrupt-json') {
        setPersistenceMessage('本地存档有异常，已安全恢复可用数据。')
      } else if (loaded.status === 'invalid-data' || loaded.status === 'unsupported-version') {
        setPersistenceMessage('本地存档无法安全读取，已进入新的临时游戏。')
      } else if (loaded.status === 'future-version') {
        setPersistenceMessage('本地存档来自较新版本，本次游戏不会覆盖它。')
      } else if (loaded.status === 'storage-error') {
        setPersistenceMessage('暂时无法读取本地存档，本次游戏不会覆盖它。')
      } else if (loaded.status === 'migrated') {
        setPersistenceMessage('本地存档已安全升级。')
      }
      setHydrationStatus('ready')
    })
    return () => {
      cancelled = true
    }
  }, [clock, repository])

  useEffect(() => {
    if (
      hydrationStatus !== 'ready' ||
      !persistenceWritable ||
      suspendAutosave.current ||
      state.persistenceRevision <= lastSavedRevision.current
    ) {
      return undefined
    }

    const revision = state.persistenceRevision
    const document = persistenceDocument
    const timer = setTimeout(() => {
      if (suspendAutosave.current) return
      void repository.save(document).then((result) => {
        if (result.ok) {
          lastSavedRevision.current = Math.max(lastSavedRevision.current, revision)
          return
        }
        setPersistenceMessage('本地保存失败，当前游戏仍可继续。')
      })
    }, 80)
    return () => clearTimeout(timer)
  }, [
    hydrationStatus,
    persistenceDocument,
    persistenceWritable,
    repository,
    state.persistenceRevision,
  ])

  const nextRunIdentity = useCallback(
    (mode: RunMode) => {
      sequence.current += 1
      return createRunIdentity(sequence.current, mode, clock)
    },
    [clock],
  )

  const reconcileAt = useCallback(
    (timestamp: number) => dispatch({ type: 'reconcile-time', timestamp }),
    [],
  )
  useRunLifecycle(clock, reconcileAt)

  useEffect(() => {
    if (!isChallengeMode(state.run.mode) || state.run.status !== 'active') return undefined
    const timer = setInterval(() => reconcileAt(clock.now()), 200)
    return () => clearInterval(timer)
  }, [clock, reconcileAt, state.run.id, state.run.mode, state.run.status])

  return {
    state,
    viewModel,
    hydrationStatus,
    persistenceMessage,
    actions: {
      increment: useCallback(
        (productId: string) => dispatch({ type: 'increment', productId, timestamp: clock.now() }),
        [clock],
      ),
      decrement: useCallback(
        (productId: string) => dispatch({ type: 'decrement', productId, timestamp: clock.now() }),
        [clock],
      ),
      max: useCallback(
        (productId: string) => dispatch({ type: 'max', productId, timestamp: clock.now() }),
        [clock],
      ),
      setQuantity: useCallback(
        (productId: string, rawQuantity: string) =>
          dispatch({
            type: 'set-quantity',
            productId,
            rawQuantity,
            timestamp: clock.now(),
          }),
        [clock],
      ),
      selectCategory: useCallback(
        (categoryId: string) => dispatch({ type: 'select-category', categoryId }),
        [],
      ),
      search: useCallback((query: string) => dispatch({ type: 'search', query }), []),
      requestRestart: useCallback(() => {
        dispatch({ type: 'request-restart', ...nextRunIdentity(state.run.mode) })
      }, [nextRunIdentity, state.run.mode]),
      confirmRestart: useCallback(() => {
        dispatch({
          type: 'confirm-restart',
          ...nextRunIdentity(state.pendingMode ?? state.run.mode),
        })
      }, [nextRunIdentity, state.pendingMode, state.run.mode]),
      cancelRestart: useCallback(() => dispatch({ type: 'cancel-restart' }), []),
      playAgain: useCallback(() => {
        dispatch({ type: 'play-again', ...nextRunIdentity(state.run.mode) })
      }, [nextRunIdentity, state.run.mode]),
      showProducts: useCallback(() => dispatch({ type: 'show-products' }), []),
      showResult: useCallback(() => dispatch({ type: 'show-result' }), []),
      dismissAchievements: useCallback(() => dispatch({ type: 'dismiss-achievements' }), []),
      dismissFeedback: useCallback(() => dispatch({ type: 'dismiss-feedback' }), []),
      openModePicker: useCallback(() => dispatch({ type: 'open-mode-picker' }), []),
      closeModePicker: useCallback(() => dispatch({ type: 'close-mode-picker' }), []),
      selectMode: useCallback(
        (mode: RunMode) => dispatch({ type: 'select-mode', mode, ...nextRunIdentity(mode) }),
        [nextRunIdentity],
      ),
      startChallenge: useCallback(
        () => dispatch({ type: 'start-challenge', timestamp: clock.now() }),
        [clock],
      ),
      continueRestoredRun: useCallback(() => dispatch({ type: 'continue-restored-run' }), []),
      restartRestoredRun: useCallback(() => {
        dispatch({ type: 'restart-restored-run', ...nextRunIdentity(state.run.mode) })
      }, [nextRunIdentity, state.run.mode]),
      requestClearData: useCallback(() => dispatch({ type: 'request-clear-data' }), []),
      cancelClearData: useCallback(() => dispatch({ type: 'cancel-clear-data' }), []),
      confirmClearData: useCallback(() => {
        suspendAutosave.current = true
        void repository.clear().then((result) => {
          if (!result.ok) {
            suspendAutosave.current = false
            setPersistenceMessage('清除本地数据失败，请稍后再试。')
            return
          }
          lastSavedRevision.current = 0
          setPersistenceWritable(true)
          setPersistenceMessage('本地游戏数据已清除。')
          dispatch({ type: 'clear-local-data', ...nextRunIdentity('free') })
          suspendAutosave.current = false
        })
      }, [nextRunIdentity, repository]),
      dismissPersistenceMessage: useCallback(() => setPersistenceMessage(null), []),
    },
  }
}
