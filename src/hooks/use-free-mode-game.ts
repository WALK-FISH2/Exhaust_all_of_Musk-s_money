import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'

import {
  createFreeModeUiState,
  deriveFreeModeViewModel,
  freeModeReducer,
} from '../application/free-mode-controller'
import { isChallengeMode, type RunMode } from '../domain/game-state'
import { SYSTEM_CLOCK, type Clock } from '../platform/clock'
import { useRunLifecycle } from '../platform/use-run-lifecycle'

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
  const [state, dispatch] = useReducer(freeModeReducer, undefined, () => {
    const identity = createRunIdentity(sequence.current, 'free', clock)
    return createFreeModeUiState(identity.runId, identity.timestamp)
  })
  const viewModel = useMemo(() => deriveFreeModeViewModel(state), [state])

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
    },
  }
}
