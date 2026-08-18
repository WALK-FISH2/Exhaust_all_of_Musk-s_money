import { useCallback, useMemo, useReducer, useRef } from 'react'

import {
  createFreeModeUiState,
  deriveFreeModeViewModel,
  freeModeReducer,
} from '../application/free-mode-controller'

function createRunIdentity(sequence: number): {
  readonly runId: string
  readonly timestamp: number
} {
  const timestamp = Date.now()
  return { runId: `free-${timestamp}-${sequence}`, timestamp }
}

export function useFreeModeGame() {
  const sequence = useRef(1)
  const [state, dispatch] = useReducer(freeModeReducer, undefined, () => {
    const identity = createRunIdentity(sequence.current)
    return createFreeModeUiState(identity.runId, identity.timestamp)
  })
  const viewModel = useMemo(() => deriveFreeModeViewModel(state), [state])

  const nextRunIdentity = useCallback(() => {
    sequence.current += 1
    return createRunIdentity(sequence.current)
  }, [])

  return {
    state,
    viewModel,
    actions: {
      increment: useCallback(
        (productId: string) => dispatch({ type: 'increment', productId, timestamp: Date.now() }),
        [],
      ),
      decrement: useCallback(
        (productId: string) => dispatch({ type: 'decrement', productId, timestamp: Date.now() }),
        [],
      ),
      max: useCallback(
        (productId: string) => dispatch({ type: 'max', productId, timestamp: Date.now() }),
        [],
      ),
      setQuantity: useCallback(
        (productId: string, rawQuantity: string) =>
          dispatch({
            type: 'set-quantity',
            productId,
            rawQuantity,
            timestamp: Date.now(),
          }),
        [],
      ),
      selectCategory: useCallback(
        (categoryId: string) => dispatch({ type: 'select-category', categoryId }),
        [],
      ),
      search: useCallback((query: string) => dispatch({ type: 'search', query }), []),
      requestRestart: useCallback(() => {
        dispatch({ type: 'request-restart', ...nextRunIdentity() })
      }, [nextRunIdentity]),
      confirmRestart: useCallback(() => {
        dispatch({ type: 'confirm-restart', ...nextRunIdentity() })
      }, [nextRunIdentity]),
      cancelRestart: useCallback(() => dispatch({ type: 'cancel-restart' }), []),
      playAgain: useCallback(() => {
        dispatch({ type: 'play-again', ...nextRunIdentity() })
      }, [nextRunIdentity]),
      showProducts: useCallback(() => dispatch({ type: 'show-products' }), []),
      dismissAchievements: useCallback(() => dispatch({ type: 'dismiss-achievements' }), []),
      dismissFeedback: useCallback(() => dispatch({ type: 'dismiss-feedback' }), []),
    },
  }
}
