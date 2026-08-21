import { CATEGORIES } from '../data/categories'
import { ACHIEVEMENT_DEFINITIONS } from '../data/achievements'
import { getChallengeDurationMs } from '../data/challenges'
import { PRODUCTS } from '../data/products'
import { updatePersistentProgressForRun, type HydratedGameProgress } from './game-persistence'
import type { AchievementId } from '../domain/achievement-types'
import {
  deriveRemainingChallengeMs,
  reconcileChallengeTime,
  startChallenge,
  type ChallengeReconciliation,
} from '../domain/challenge'
import type { ProductDefinition } from '../domain/catalog'
import {
  decrementProduct,
  incrementProduct,
  maxProduct,
  setProductQuantity,
  type CommandResult,
} from '../domain/commands'
import type { DomainErrorCode } from '../domain/errors'
import {
  createRun,
  getProductQuantity,
  getProductUnitPriceUsd,
  isChallengeMode,
  type ChallengeMode,
  type RunMode,
  type RunState,
} from '../domain/game-state'
import { multiplyUsd } from '../domain/money'
import { createEmptyLocalRecords, type LocalRecords } from '../domain/records'
import { deriveReceipt, type Receipt } from '../domain/receipt'
import {
  deriveChallengeResult,
  deriveResultMetrics,
  type ChallengeRunResult,
  type RunResultMetrics,
} from '../domain/results'
import { createDefaultPreferences, type Preferences } from '../storage/schema'

export type FreeModeView = 'products' | 'result'
export type UiNoticeCode = 'QUANTITY_CLAMPED' | 'MAX_NO_CHANGE'

export interface FreeModeUiState {
  readonly run: RunState
  readonly selectedCategoryId: 'all' | string
  readonly searchQuery: string
  readonly view: FreeModeView
  readonly restartConfirmationOpen: boolean
  readonly errorCode: DomainErrorCode | null
  readonly noticeCode: UiNoticeCode | null
  readonly achievementNotifications: readonly AchievementId[]
  readonly observedNowMs: number
  readonly modePickerOpen: boolean
  readonly pendingMode: RunMode | null
  readonly lifetimeAchievementIds: readonly AchievementId[]
  readonly records: LocalRecords
  readonly preferences: Preferences
  readonly beatenRecordKinds: readonly ('highest-spending' | 'fastest-clear')[]
  readonly restorePromptOpen: boolean
  readonly clearDataConfirmationOpen: boolean
  readonly persistenceRevision: number
}

export interface ProductCardViewModel {
  readonly product: ProductDefinition
  readonly quantity: number
  readonly subtotalUsd: number
}

export interface FreeModeViewModel {
  readonly metrics: RunResultMetrics
  readonly receipt: Receipt
  readonly visibleProducts: readonly ProductCardViewModel[]
  readonly isReadOnly: boolean
  readonly isFrozen: boolean
  readonly canPurchase: boolean
  readonly challengeDurationMs: number | null
  readonly remainingChallengeMs: number | null
  readonly challengeResult: ChallengeRunResult | null
  readonly unlockedAchievementCount: number
  readonly totalAchievementCount: number
  readonly lifetimeAchievementCount: number
  readonly records: LocalRecords
}

export type FreeModeAction =
  | { readonly type: 'increment'; readonly productId: string; readonly timestamp: number }
  | { readonly type: 'decrement'; readonly productId: string; readonly timestamp: number }
  | { readonly type: 'max'; readonly productId: string; readonly timestamp: number }
  | {
      readonly type: 'set-quantity'
      readonly productId: string
      readonly rawQuantity: string
      readonly timestamp: number
    }
  | { readonly type: 'select-category'; readonly categoryId: string }
  | { readonly type: 'search'; readonly query: string }
  | { readonly type: 'request-restart'; readonly runId: string; readonly timestamp: number }
  | { readonly type: 'confirm-restart'; readonly runId: string; readonly timestamp: number }
  | { readonly type: 'cancel-restart' }
  | { readonly type: 'play-again'; readonly runId: string; readonly timestamp: number }
  | { readonly type: 'show-products' }
  | { readonly type: 'show-result' }
  | { readonly type: 'dismiss-achievements' }
  | { readonly type: 'dismiss-feedback' }
  | { readonly type: 'open-mode-picker' }
  | { readonly type: 'close-mode-picker' }
  | {
      readonly type: 'select-mode'
      readonly mode: RunMode
      readonly runId: string
      readonly timestamp: number
    }
  | { readonly type: 'start-challenge'; readonly timestamp: number }
  | { readonly type: 'reconcile-time'; readonly timestamp: number }
  | { readonly type: 'hydrate'; readonly progress: HydratedGameProgress }
  | { readonly type: 'continue-restored-run' }
  | { readonly type: 'restart-restored-run'; readonly runId: string; readonly timestamp: number }
  | { readonly type: 'request-clear-data' }
  | { readonly type: 'cancel-clear-data' }
  | {
      readonly type: 'set-reduced-motion'
      readonly value: Preferences['reducedMotion']
    }
  | { readonly type: 'clear-local-data'; readonly runId: string; readonly timestamp: number }

export class FreeModeControllerError extends Error {
  readonly code = 'FREE_MODE_INITIALIZATION_FAILED' as const

  constructor() {
    super('FREE_MODE_INITIALIZATION_FAILED')
    this.name = 'FreeModeControllerError'
  }
}

function createModeUiState(mode: RunMode, runId: string, timestamp: number): FreeModeUiState {
  const result = createRun({ id: runId, mode, timestamp })
  if (!result.ok) throw new FreeModeControllerError()
  return {
    run: result.value,
    selectedCategoryId: 'all',
    searchQuery: '',
    view: 'products',
    restartConfirmationOpen: false,
    errorCode: null,
    noticeCode: null,
    achievementNotifications: [],
    observedNowMs: timestamp,
    modePickerOpen: false,
    pendingMode: null,
    lifetimeAchievementIds: [],
    records: createEmptyLocalRecords(),
    preferences: createDefaultPreferences(),
    beatenRecordKinds: [],
    restorePromptOpen: false,
    clearDataConfirmationOpen: false,
    persistenceRevision: 0,
  }
}

export function createFreeModeUiState(runId: string, timestamp: number): FreeModeUiState {
  return createModeUiState('free', runId, timestamp)
}

export function createChallengeUiState(
  mode: ChallengeMode,
  runId: string,
  timestamp: number,
): FreeModeUiState {
  return createModeUiState(mode, runId, timestamp)
}

export function parseQuantityInput(rawQuantity: string): number {
  const normalized = rawQuantity.trim()
  if (normalized === '') return 0
  if (!/^-?\d+$/.test(normalized)) return Number.NaN
  return Number(normalized)
}

export function filterCatalogProducts(
  products: readonly ProductDefinition[],
  selectedCategoryId: string,
  searchQuery: string,
): readonly ProductDefinition[] {
  const normalizedQuery = searchQuery.trim().toLowerCase()
  return products.filter((product) => {
    if (selectedCategoryId !== 'all' && product.categoryId !== selectedCategoryId) return false
    if (normalizedQuery === '') return true
    return [product.nameZh, product.nameEn, product.id, ...product.keywords].some((candidate) =>
      candidate.toLowerCase().includes(normalizedQuery),
    )
  })
}

export function deriveFreeModeViewModel(state: FreeModeUiState): FreeModeViewModel {
  const visibleProducts = filterCatalogProducts(
    PRODUCTS,
    state.selectedCategoryId,
    state.searchQuery,
  ).map((product) => {
    const quantity = getProductQuantity(state.run, product.id)
    return {
      product,
      quantity,
      subtotalUsd: multiplyUsd(getProductUnitPriceUsd(state.run, product), quantity),
    }
  })

  const isFrozen = state.run.status === 'completed' || state.run.status === 'expired'
  const challengeDurationMs = isChallengeMode(state.run.mode)
    ? getChallengeDurationMs(state.run.mode)
    : null
  return {
    metrics: deriveResultMetrics(state.run),
    receipt: deriveReceipt(state.run),
    visibleProducts,
    isReadOnly: state.run.status !== 'active',
    isFrozen,
    canPurchase: state.run.status === 'active',
    challengeDurationMs,
    remainingChallengeMs: isChallengeMode(state.run.mode)
      ? deriveRemainingChallengeMs(state.run, state.observedNowMs)
      : null,
    challengeResult: deriveChallengeResult(state.run),
    unlockedAchievementCount: state.run.runUnlockedAchievementIds.length,
    totalAchievementCount: ACHIEVEMENT_DEFINITIONS.length,
    lifetimeAchievementCount: state.lifetimeAchievementIds.length,
    records: state.records,
  }
}

function resetRun(
  state: FreeModeUiState,
  mode: RunMode,
  runId: string,
  timestamp: number,
): FreeModeUiState {
  const fresh = createModeUiState(mode, runId, timestamp)
  return {
    ...fresh,
    lifetimeAchievementIds: state.lifetimeAchievementIds,
    records: state.records,
    preferences: state.preferences,
    persistenceRevision: state.persistenceRevision + 1,
  }
}

function applyPersistentRunUpdate(
  state: FreeModeUiState,
  run: RunState,
  runChanged: boolean,
): Pick<
  FreeModeUiState,
  'run' | 'lifetimeAchievementIds' | 'records' | 'beatenRecordKinds' | 'persistenceRevision'
> {
  const progress = updatePersistentProgressForRun(state.lifetimeAchievementIds, state.records, run)
  return {
    run,
    lifetimeAchievementIds: progress.lifetimeAchievementIds,
    records: progress.records,
    beatenRecordKinds: progress.beatenRecordKinds,
    persistenceRevision:
      runChanged || progress.changed ? state.persistenceRevision + 1 : state.persistenceRevision,
  }
}

function applyReconciliation(
  state: FreeModeUiState,
  reconciliation: ChallengeReconciliation,
  timestamp: number,
  errorCode: DomainErrorCode | null = null,
): FreeModeUiState {
  const persistent = applyPersistentRunUpdate(state, reconciliation.state, reconciliation.changed)
  return {
    ...state,
    ...persistent,
    observedNowMs: timestamp,
    view:
      reconciliation.changed && reconciliation.state.status === 'expired' ? 'result' : state.view,
    errorCode,
    noticeCode: null,
    achievementNotifications: [
      ...state.achievementNotifications,
      ...reconciliation.newlyUnlockedAchievementIds,
    ],
  }
}

function applyCommandResult(
  state: FreeModeUiState,
  result: CommandResult,
  noticeCode: UiNoticeCode | null = null,
): FreeModeUiState {
  if (!result.ok) {
    if ('reconciliation' in result) {
      return applyReconciliation(
        state,
        result.reconciliation,
        result.reconciliation.event?.timestamp ?? state.observedNowMs,
        result.error.code,
      )
    }
    return { ...state, errorCode: result.error.code, noticeCode: null }
  }

  const nextRun = result.value.state
  const persistent = applyPersistentRunUpdate(state, nextRun, result.value.changed)
  return {
    ...state,
    ...persistent,
    view: nextRun.status === 'completed' ? 'result' : state.view,
    observedNowMs: result.value.event.timestamp,
    errorCode: null,
    noticeCode,
    achievementNotifications: [
      ...state.achievementNotifications,
      ...result.value.newlyUnlockedAchievementIds,
    ],
  }
}

export function freeModeReducer(state: FreeModeUiState, action: FreeModeAction): FreeModeUiState {
  switch (action.type) {
    case 'increment':
      return applyCommandResult(
        state,
        incrementProduct(state.run, {
          productId: action.productId,
          timestamp: action.timestamp,
        }),
      )
    case 'decrement':
      return applyCommandResult(
        state,
        decrementProduct(state.run, {
          productId: action.productId,
          timestamp: action.timestamp,
        }),
      )
    case 'max': {
      const result = maxProduct(state.run, {
        productId: action.productId,
        timestamp: action.timestamp,
      })
      return applyCommandResult(
        state,
        result,
        result.ok && !result.value.changed ? 'MAX_NO_CHANGE' : null,
      )
    }
    case 'set-quantity': {
      const requestedQuantity = parseQuantityInput(action.rawQuantity)
      const result = setProductQuantity(state.run, {
        productId: action.productId,
        quantity: requestedQuantity,
        timestamp: action.timestamp,
      })
      if (!result.ok) return applyCommandResult(state, result)
      const appliedQuantity = getProductQuantity(result.value.state, action.productId)
      const wasClamped =
        requestedQuantity < 0 ||
        (Number.isSafeInteger(requestedQuantity) && appliedQuantity !== requestedQuantity)
      return applyCommandResult(state, result, wasClamped ? 'QUANTITY_CLAMPED' : null)
    }
    case 'select-category': {
      const validCategory =
        action.categoryId === 'all' ||
        CATEGORIES.some((category) => category.id === action.categoryId)
      return {
        ...state,
        selectedCategoryId: validCategory ? action.categoryId : 'all',
      }
    }
    case 'search':
      return { ...state, searchQuery: action.query }
    case 'request-restart':
      return deriveResultMetrics(state.run).totalSpentUsd > 0
        ? { ...state, restartConfirmationOpen: true }
        : resetRun(state, state.run.mode, action.runId, action.timestamp)
    case 'confirm-restart': {
      const targetMode = state.pendingMode ?? state.run.mode
      return resetRun(state, targetMode, action.runId, action.timestamp)
    }
    case 'play-again':
      return resetRun(state, state.run.mode, action.runId, action.timestamp)
    case 'cancel-restart':
      return { ...state, restartConfirmationOpen: false, pendingMode: null }
    case 'show-products':
      return { ...state, view: 'products' }
    case 'show-result':
      return state.run.status === 'completed' || state.run.status === 'expired'
        ? { ...state, view: 'result' }
        : state
    case 'dismiss-achievements':
      return { ...state, achievementNotifications: [] }
    case 'dismiss-feedback':
      return { ...state, errorCode: null, noticeCode: null }
    case 'open-mode-picker':
      return { ...state, modePickerOpen: true }
    case 'close-mode-picker':
      return { ...state, modePickerOpen: false }
    case 'select-mode': {
      const isFrozen = state.run.status === 'completed' || state.run.status === 'expired'
      const requiresConfirmation = !isFrozen && deriveResultMetrics(state.run).totalSpentUsd > 0
      return requiresConfirmation
        ? {
            ...state,
            modePickerOpen: false,
            restartConfirmationOpen: true,
            pendingMode: action.mode,
          }
        : resetRun(state, action.mode, action.runId, action.timestamp)
    }
    case 'start-challenge': {
      const result = startChallenge(state.run, action.timestamp)
      return result.ok
        ? {
            ...state,
            ...applyPersistentRunUpdate(state, result.value, true),
            view: 'products',
            observedNowMs: action.timestamp,
            errorCode: null,
            noticeCode: null,
          }
        : { ...state, errorCode: result.error.code, noticeCode: null }
    }
    case 'reconcile-time': {
      const result = reconcileChallengeTime(state.run, action.timestamp)
      if (!result.ok) {
        return {
          ...state,
          observedNowMs: action.timestamp,
          errorCode: result.error.code,
          noticeCode: null,
        }
      }
      return applyReconciliation(state, result.value, action.timestamp)
    }
    case 'hydrate':
      return {
        ...state,
        run: action.progress.run,
        selectedCategoryId: 'all',
        searchQuery: '',
        view: action.progress.shouldOpenResult ? 'result' : 'products',
        restartConfirmationOpen: false,
        errorCode: null,
        noticeCode: null,
        achievementNotifications: [],
        observedNowMs: action.progress.observedNowMs,
        modePickerOpen: false,
        pendingMode: null,
        lifetimeAchievementIds: action.progress.lifetimeAchievementIds,
        records: action.progress.records,
        preferences: action.progress.preferences,
        beatenRecordKinds: action.progress.beatenRecordKinds,
        restorePromptOpen: action.progress.restorePromptOpen,
        clearDataConfirmationOpen: false,
        persistenceRevision: action.progress.requiresSave ? 1 : 0,
      }
    case 'continue-restored-run':
      return { ...state, restorePromptOpen: false }
    case 'restart-restored-run':
      return {
        ...resetRun(state, state.run.mode, action.runId, action.timestamp),
        restorePromptOpen: false,
      }
    case 'request-clear-data':
      return { ...state, clearDataConfirmationOpen: true }
    case 'cancel-clear-data':
      return { ...state, clearDataConfirmationOpen: false }
    case 'set-reduced-motion':
      return state.preferences.reducedMotion === action.value
        ? state
        : {
            ...state,
            preferences: { ...state.preferences, reducedMotion: action.value },
            persistenceRevision: state.persistenceRevision + 1,
          }
    case 'clear-local-data':
      return createModeUiState('free', action.runId, action.timestamp)
  }
}
