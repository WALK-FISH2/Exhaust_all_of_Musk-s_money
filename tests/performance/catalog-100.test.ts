import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { filterCatalogProducts } from '../../src/application/free-mode-controller'
import { M5_BENCHMARK_PRODUCTS, M5_BENCHMARK_VISUAL_BY_ID } from '../../src/benchmark/products'
import { ProductCard } from '../../src/components/game/ProductCard'
import { PRODUCTS } from '../../src/data/products'
import type { RunState } from '../../src/domain/game-state'
import { deriveReceipt } from '../../src/domain/receipt'
import { deriveResultMetrics } from '../../src/domain/results'

vi.mock('@tarojs/components', () => ({
  Button: 'taro-button-core',
  Input: 'taro-input-core',
  Text: 'taro-text-core',
  View: 'taro-view-core',
}))

const purchased = M5_BENCHMARK_PRODUCTS.filter((product) => product.priceUsd < 1_000_000).slice(
  0,
  20,
)
const quantities = Object.fromEntries(purchased.map((product) => [product.id, 1]))
const unitPriceSnapshotsUsd = Object.fromEntries(
  purchased.map((product) => [product.id, product.priceUsd]),
)
const BENCHMARK_RUN: RunState = {
  id: 'benchmark-100',
  catalogVersion: 2,
  mode: 'free',
  initialBudgetUsd: 400_000_000_000,
  quantities,
  unitPriceSnapshotsUsd,
  startedAt: 1_000,
  deadlineAt: null,
  durationMs: null,
  completedAt: null,
  status: 'active',
  runUnlockedAchievementIds: [],
}

describe('100-product performance fixture', () => {
  it('renders, filters, derives receipt/results, and updates one item within guardrail budgets', () => {
    const callbacks = {
      onIncrement: vi.fn(),
      onDecrement: vi.fn(),
      onMax: vi.fn(),
      onSetQuantity: vi.fn(),
    }

    const renderStarted = performance.now()
    const markup = renderToStaticMarkup(
      createElement(
        'div',
        null,
        M5_BENCHMARK_PRODUCTS.map((product) =>
          createElement(ProductCard, {
            key: product.id,
            product,
            quantity: 0,
            subtotalUsd: 0,
            visualSymbol: M5_BENCHMARK_VISUAL_BY_ID.get(product.id) ?? '✦',
            readOnly: false,
            ...callbacks,
          }),
        ),
      ),
    )
    const renderMs = performance.now() - renderStarted

    const filterStarted = performance.now()
    for (let index = 0; index < 500; index += 1) {
      filterCatalogProducts(M5_BENCHMARK_PRODUCTS, index % 2 === 0 ? 'all' : 'tech', 'benchmark')
    }
    const filterMs = performance.now() - filterStarted

    const derivationStarted = performance.now()
    for (let index = 0; index < 500; index += 1) {
      deriveReceipt(BENCHMARK_RUN, M5_BENCHMARK_PRODUCTS)
      deriveResultMetrics(BENCHMARK_RUN, M5_BENCHMARK_PRODUCTS)
    }
    const derivationMs = performance.now() - derivationStarted

    const changedProduct = purchased[0]!
    const updateStarted = performance.now()
    const updatedRun: RunState = {
      ...BENCHMARK_RUN,
      quantities: { ...BENCHMARK_RUN.quantities, [changedProduct.id]: 2 },
    }
    const updatedReceipt = deriveReceipt(updatedRun, M5_BENCHMARK_PRODUCTS)
    const updateMs = performance.now() - updateStarted

    expect(markup.match(/className="product-card /g)).toHaveLength(100)
    expect(PRODUCTS).toHaveLength(45)
    expect(new Set(M5_BENCHMARK_PRODUCTS.map((product) => product.id)).size).toBe(100)
    expect(updatedReceipt.lines).toHaveLength(purchased.length)
    expect(renderMs).toBeLessThan(2_000)
    expect(filterMs).toBeLessThan(1_000)
    expect(derivationMs).toBeLessThan(2_000)
    expect(updateMs).toBeLessThan(50)

    console.info(
      JSON.stringify({
        scenario: 'catalog-100',
        renderMs,
        filter500Ms: filterMs,
        derivation500Ms: derivationMs,
        updateMs,
      }),
    )
  })
})
