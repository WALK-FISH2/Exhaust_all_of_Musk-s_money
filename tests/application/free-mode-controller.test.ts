import { describe, expect, it } from 'vitest'

import {
  createFreeModeUiState,
  deriveFreeModeViewModel,
  filterCatalogProducts,
  freeModeReducer,
  parseQuantityInput,
  type FreeModeAction,
  type FreeModeUiState,
} from '../../src/application/free-mode-controller'
import { PRODUCTS, EXACT_ZERO_REGRESSION_PATH } from '../../src/data/products'
import { getProductQuantity } from '../../src/domain/game-state'
import { INITIAL_BUDGET_USD } from '../../src/domain/money'

function reduce(state: FreeModeUiState, action: FreeModeAction): FreeModeUiState {
  return freeModeReducer(state, action)
}

function setQuantity(
  state: FreeModeUiState,
  productId: string,
  quantity: number,
  timestamp: number,
): FreeModeUiState {
  return reduce(state, {
    type: 'set-quantity',
    productId,
    rawQuantity: String(quantity),
    timestamp,
  })
}

describe('free-mode catalog controller', () => {
  it('starts with the canonical $400B RunState and an empty receipt', () => {
    const state = createFreeModeUiState('free-test', 1_000)
    const view = deriveFreeModeViewModel(state)

    expect(state.run.mode).toBe('free')
    expect(state.run.status).toBe('active')
    expect(view.metrics.remainingBalanceUsd).toBe(INITIAL_BUDGET_USD)
    expect(view.metrics.totalSpentUsd).toBe(0)
    expect(view.receipt.lines).toEqual([])
    expect(view.visibleProducts).toHaveLength(PRODUCTS.length)

    const afterShowResult = reduce(state, { type: 'show-result' })
    expect(afterShowResult).toBe(state)
    expect(afterShowResult.view).toBe('products')
  })

  it('routes increment, decrement, and MAX through domain commands', () => {
    let state = createFreeModeUiState('free-actions', 1_000)
    state = reduce(state, { type: 'increment', productId: 'bubble-tea', timestamp: 1_001 })
    expect(getProductQuantity(state.run, 'bubble-tea')).toBe(1)
    expect(deriveFreeModeViewModel(state).metrics.totalSpentUsd).toBe(6)

    state = reduce(state, { type: 'decrement', productId: 'bubble-tea', timestamp: 1_002 })
    expect(getProductQuantity(state.run, 'bubble-tea')).toBe(0)
    expect(deriveFreeModeViewModel(state).metrics.remainingBalanceUsd).toBe(INITIAL_BUDGET_USD)

    state = reduce(state, { type: 'max', productId: 'private-train', timestamp: 1_003 })
    expect(getProductQuantity(state.run, 'private-train')).toBe(7_999)
    expect(deriveFreeModeViewModel(state).metrics.remainingBalanceUsd).toBe(50_000_000)
    expect(state.run.runUnlockedAchievementIds).toContain('max-button')
  })

  it('combines category and local multilingual search without losing purchases', () => {
    let state = createFreeModeUiState('free-filter', 1_000)
    state = reduce(state, { type: 'increment', productId: 'gaming-pc', timestamp: 1_001 })
    state = reduce(state, { type: 'select-category', categoryId: 'tech' })
    state = reduce(state, { type: 'search', query: 'gaming' })

    let view = deriveFreeModeViewModel(state)
    expect(view.visibleProducts.map((item) => item.product.id)).toEqual(['gaming-pc'])

    state = reduce(state, { type: 'search', query: '机器人' })
    view = deriveFreeModeViewModel(state)
    expect(view.visibleProducts.map((item) => item.product.id)).toEqual(['robot-lab'])

    state = reduce(state, { type: 'select-category', categoryId: 'all' })
    state = reduce(state, { type: 'search', query: '' })
    expect(getProductQuantity(state.run, 'gaming-pc')).toBe(1)
    expect(deriveFreeModeViewModel(state).receipt.lines[0]?.productId).toBe('gaming-pc')
  })

  it('matches product IDs and keywords without network lookup', () => {
    expect(filterCatalogProducts(PRODUCTS, 'all', 'exact-zero').map((item) => item.id)).toEqual([
      'lucky-sticker',
    ])
    expect(filterCatalogProducts(PRODUCTS, 'space', 'mars-city').map((item) => item.id)).toEqual([
      'mars-city',
    ])
    expect(filterCatalogProducts(PRODUCTS, 'food', 'mars')).toEqual([])
  })

  it('parses only plain integers and delegates negative clamping to domain', () => {
    expect(parseQuantityInput(' 42 ')).toBe(42)
    expect(parseQuantityInput('')).toBe(0)
    expect(parseQuantityInput('-2')).toBe(-2)
    expect(parseQuantityInput('1.5')).toBeNaN()
    expect(parseQuantityInput('1e3')).toBeNaN()

    let state = createFreeModeUiState('free-input', 1_000)
    state = setQuantity(state, 'bubble-tea', 12, 1_001)
    state = reduce(state, {
      type: 'set-quantity',
      productId: 'bubble-tea',
      rawQuantity: '-3',
      timestamp: 1_002,
    })
    expect(getProductQuantity(state.run, 'bubble-tea')).toBe(0)
    expect(state.noticeCode).toBe('QUANTITY_CLAMPED')

    state = reduce(state, {
      type: 'set-quantity',
      productId: 'bubble-tea',
      rawQuantity: '1.5',
      timestamp: 1_003,
    })
    expect(state.errorCode).toBe('INVALID_QUANTITY')
  })

  it('clamps direct quantity to the product cap and keeps receipt totals synchronized', () => {
    let state = createFreeModeUiState('free-cap', 1_000)
    state = setQuantity(state, 'lucky-sticker', 2_000_000_000, 1_001)
    let view = deriveFreeModeViewModel(state)

    expect(getProductQuantity(state.run, 'lucky-sticker')).toBe(1_000_000_000)
    expect(state.noticeCode).toBe('QUANTITY_CLAMPED')
    expect(view.receipt.lines[0]).toMatchObject({
      productId: 'lucky-sticker',
      quantity: 1_000_000_000,
      subtotalUsd: 1_000_000_000,
    })

    state = setQuantity(state, 'lucky-sticker', 0, 1_002)
    view = deriveFreeModeViewModel(state)
    expect(view.receipt.lines).toEqual([])
    expect(view.receipt.totalSpentUsd).toBe(0)
  })

  it('requires confirmation for a non-empty restart and resets all per-run state', () => {
    let state = createFreeModeUiState('free-restart', 1_000)
    state = reduce(state, { type: 'increment', productId: 'lucky-sticker', timestamp: 1_001 })
    state = reduce(state, {
      type: 'request-restart',
      runId: 'ignored-until-confirmed',
      timestamp: 1_002,
    })

    expect(state.restartConfirmationOpen).toBe(true)
    expect(getProductQuantity(state.run, 'lucky-sticker')).toBe(1)

    state = reduce(state, {
      type: 'confirm-restart',
      runId: 'free-restarted',
      timestamp: 1_003,
    })
    const view = deriveFreeModeViewModel(state)
    expect(state.run.id).toBe('free-restarted')
    expect(state.restartConfirmationOpen).toBe(false)
    expect(view.metrics.totalSpentUsd).toBe(0)
    expect(state.run.runUnlockedAchievementIds).toEqual([])
  })
})

describe('free-mode completion flow', () => {
  it('completes through the published exact-zero path and becomes read-only', () => {
    let state = createFreeModeUiState('free-exact-zero', 1_000)
    EXACT_ZERO_REGRESSION_PATH.forEach((line, index) => {
      state = setQuantity(state, line.productId, line.quantity, 1_001 + index)
    })

    const view = deriveFreeModeViewModel(state)
    expect(view.metrics.remainingBalanceUsd).toBe(0)
    expect(view.metrics.totalSpentUsd).toBe(INITIAL_BUDGET_USD)
    expect(view.metrics.wasteIndex).toBe(100)
    expect(state.run.status).toBe('completed')
    expect(state.view).toBe('result')
    expect(view.isReadOnly).toBe(true)
    expect(state.run.runUnlockedAchievementIds).toContain('exact-zero')

    const completedRun = state.run
    state = reduce(state, { type: 'increment', productId: 'lucky-sticker', timestamp: 2_000 })
    expect(state.run).toBe(completedRun)
    expect(state.errorCode).toBe('GAME_ALREADY_COMPLETED')

    state = reduce(state, { type: 'show-products' })
    expect(state.view).toBe('products')
    expect(deriveFreeModeViewModel(state).isReadOnly).toBe(true)

    const frozenRun = state.run
    const completedMetrics = deriveFreeModeViewModel(state).metrics
    state = reduce(state, { type: 'show-result' })
    expect(state.view).toBe('result')
    expect(state.run).toBe(frozenRun)
    expect(deriveFreeModeViewModel(state).metrics).toEqual(completedMetrics)
  })

  it('unlocks the last-dollar achievement through the UI action sequence', () => {
    let state = createFreeModeUiState('free-last-dollar', 1_000)
    const setup: readonly [string, number][] = [
      ['orbital-ring-study', 1],
      ['mars-city', 1],
      ['lunar-base', 2],
      ['ocean-cleanup', 1],
      ['football-club', 1],
      ['solar-farm', 1],
      ['moon-trip', 1],
      ['lucky-sticker', 999_999_999],
    ]
    setup.forEach(([productId, quantity], index) => {
      state = setQuantity(state, productId, quantity, 1_001 + index)
    })
    expect(deriveFreeModeViewModel(state).metrics.remainingBalanceUsd).toBe(1)

    state = reduce(state, {
      type: 'increment',
      productId: 'lucky-sticker',
      timestamp: 2_000,
    })
    expect(state.run.status).toBe('completed')
    expect(state.run.runUnlockedAchievementIds).toContain('sticker-finish')
    expect(state.achievementNotifications).toContain('sticker-finish')
  })

  it('starts a clean active run from the result screen', () => {
    let state = createFreeModeUiState('free-play-again-source', 1_000)
    EXACT_ZERO_REGRESSION_PATH.forEach((line, index) => {
      state = setQuantity(state, line.productId, line.quantity, 1_001 + index)
    })
    state = reduce(state, {
      type: 'play-again',
      runId: 'free-play-again-target',
      timestamp: 2_000,
    })

    expect(state.run.id).toBe('free-play-again-target')
    expect(state.run.status).toBe('active')
    expect(state.view).toBe('products')
    expect(deriveFreeModeViewModel(state).metrics.remainingBalanceUsd).toBe(INITIAL_BUDGET_USD)
  })
})
