import { Text, View } from '@tarojs/components'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { filterCatalogProducts, parseQuantityInput } from '../application/free-mode-controller'
import { BalancePanel } from '../components/game/BalancePanel'
import { CatalogToolbar } from '../components/game/CatalogToolbar'
import { ProductCard } from '../components/game/ProductCard'
import { ReceiptPanel } from '../components/game/ReceiptPanel'
import type { RunState } from '../domain/game-state'
import { addUsd, multiplyUsd } from '../domain/money'
import { deriveReceipt } from '../domain/receipt'
import { deriveResultMetrics } from '../domain/results'
import { M5_BENCHMARK_COPY } from '../i18n/m5'
import {
  M5_BENCHMARK_PRODUCT_BY_ID,
  M5_BENCHMARK_PRODUCTS,
  M5_BENCHMARK_VISUAL_BY_ID,
} from './products'
import { getM5RuntimeConsoleErrors, installM5RuntimeBridge } from './runtime-bridge'

const INITIAL_BUDGET_USD = 400_000_000_000
const INITIAL_RENDER_COUNT = 20
const RENDER_BATCH_SIZE = 20

type BenchmarkQuantities = Readonly<Record<string, number>>
type QuantityRequest = number | ((currentQuantity: number) => number)

function deriveSpentUsd(quantities: BenchmarkQuantities): number {
  return M5_BENCHMARK_PRODUCTS.reduce((total, product) => {
    return addUsd(total, multiplyUsd(product.priceUsd, quantities[product.id] ?? 0))
  }, 0)
}

function createBenchmarkRun(quantities: BenchmarkQuantities): RunState {
  const unitPriceSnapshotsUsd = Object.fromEntries(
    M5_BENCHMARK_PRODUCTS.filter((product) => (quantities[product.id] ?? 0) > 0).map((product) => [
      product.id,
      product.priceUsd,
    ]),
  )
  return {
    id: 'm5-weapp-benchmark',
    catalogVersion: 2,
    mode: 'free',
    initialBudgetUsd: INITIAL_BUDGET_USD,
    quantities,
    unitPriceSnapshotsUsd,
    startedAt: 0,
    deadlineAt: null,
    durationMs: null,
    completedAt: null,
    status: 'active',
    runUnlockedAchievementIds: [],
  }
}

export function WeappCatalogBenchmark(): JSX.Element {
  const [quantities, setQuantities] = useState<BenchmarkQuantities>({})
  const [selectedCategoryId, setSelectedCategoryId] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [renderLimit, setRenderLimit] = useState(INITIAL_RENDER_COUNT)

  const run = useMemo(() => createBenchmarkRun(quantities), [quantities])
  const metrics = useMemo(() => deriveResultMetrics(run, M5_BENCHMARK_PRODUCTS), [run])
  const receipt = useMemo(() => deriveReceipt(run, M5_BENCHMARK_PRODUCTS), [run])
  const visibleProducts = useMemo(
    () => filterCatalogProducts(M5_BENCHMARK_PRODUCTS, selectedCategoryId, searchQuery),
    [searchQuery, selectedCategoryId],
  )
  const renderedProducts = useMemo(
    () => visibleProducts.slice(0, renderLimit),
    [renderLimit, visibleProducts],
  )

  useEffect(() => {
    if (renderLimit >= visibleProducts.length) return undefined
    const timer = setTimeout(() => {
      setRenderLimit((current) => Math.min(current + RENDER_BATCH_SIZE, visibleProducts.length))
    }, 32)
    return () => clearTimeout(timer)
  }, [renderLimit, visibleProducts.length])

  const applyQuantity = useCallback((productId: string, request: QuantityRequest) => {
    const product = M5_BENCHMARK_PRODUCT_BY_ID.get(productId)
    if (product === undefined) return
    setQuantities((current) => {
      const currentQuantity = current[productId] ?? 0
      const requestedQuantity = typeof request === 'function' ? request(currentQuantity) : request
      if (!Number.isSafeInteger(requestedQuantity)) return current
      const totalSpentUsd = deriveSpentUsd(current)
      const currentSubtotalUsd = multiplyUsd(product.priceUsd, currentQuantity)
      const otherSpentUsd = totalSpentUsd - currentSubtotalUsd
      const affordableQuantity = Math.floor((INITIAL_BUDGET_USD - otherSpentUsd) / product.priceUsd)
      const nextQuantity = Math.max(
        0,
        Math.min(requestedQuantity, product.maxQuantityPerRun, affordableQuantity),
      )
      return nextQuantity === currentQuantity ? current : { ...current, [productId]: nextQuantity }
    })
  }, [])

  const increment = useCallback(
    (productId: string) => applyQuantity(productId, (currentQuantity) => currentQuantity + 1),
    [applyQuantity],
  )
  const decrement = useCallback(
    (productId: string) => applyQuantity(productId, (currentQuantity) => currentQuantity - 1),
    [applyQuantity],
  )
  const max = useCallback(
    (productId: string) => {
      const product = M5_BENCHMARK_PRODUCT_BY_ID.get(productId)
      if (product !== undefined) applyQuantity(productId, product.maxQuantityPerRun)
    },
    [applyQuantity],
  )
  const setQuantity = useCallback(
    (productId: string, rawQuantity: string) => {
      const parsed = parseQuantityInput(rawQuantity)
      if (Number.isFinite(parsed)) applyQuantity(productId, parsed)
    },
    [applyQuantity],
  )

  useEffect(
    () =>
      installM5RuntimeBridge({
        kind: 'catalog-100',
        snapshot: () => ({
          ready: renderedProducts.length === visibleProducts.length,
          productCount: M5_BENCHMARK_PRODUCTS.length,
          visibleCount: visibleProducts.length,
          renderedCount: renderedProducts.length,
          selectedCategoryId,
          searchQuery,
          firstQuantity: quantities['benchmark-001'] ?? 0,
          receiptLineCount: receipt.lines.length,
          receiptFirstQuantity:
            receipt.lines.find((line) => line.productId === 'benchmark-001')?.quantity ?? 0,
          totalSpentUsd: metrics.totalSpentUsd,
          runtimeConsoleErrors: getM5RuntimeConsoleErrors(),
        }),
        invoke: (action, first) => {
          if (action === 'category') setSelectedCategoryId(first ?? 'all')
          else if (action === 'search') setSearchQuery(first ?? '')
          else if (action === 'increment') increment(first ?? 'benchmark-001')
          else if (action === 'decrement') decrement(first ?? 'benchmark-001')
          else if (action === 'max') max(first ?? 'benchmark-001')
          else if (action === 'quantity') setQuantity('benchmark-001', first ?? '0')
        },
      }),
    [
      decrement,
      increment,
      max,
      metrics.totalSpentUsd,
      quantities,
      receipt.lines,
      renderedProducts.length,
      searchQuery,
      selectedCategoryId,
      setQuantity,
      visibleProducts.length,
    ],
  )

  return (
    <View id='m5-weapp-benchmark' className='game-page motion-reduce'>
      <View className='game-shell'>
        <View className='m5-benchmark-banner'>
          <Text className='m5-benchmark-banner__eyebrow'>{M5_BENCHMARK_COPY.eyebrow}</Text>
          <Text className='m5-benchmark-banner__title'>{M5_BENCHMARK_COPY.title}</Text>
          <Text className='m5-benchmark-banner__hint'>{M5_BENCHMARK_COPY.hint}</Text>
          <View className='m5-benchmark-metrics'>
            <Text id='m5-benchmark-total-count'>
              {M5_BENCHMARK_COPY.totalProducts}: {M5_BENCHMARK_PRODUCTS.length}
            </Text>
            <Text id='m5-benchmark-visible-count'>
              {M5_BENCHMARK_COPY.visibleProducts}: {visibleProducts.length}
            </Text>
            <Text id='m5-benchmark-rendered-count'>
              {M5_BENCHMARK_COPY.renderedProducts}: {renderedProducts.length}
            </Text>
            <Text id='m5-benchmark-total-spent'>
              {M5_BENCHMARK_COPY.totalSpent}: {metrics.totalSpentUsd}
            </Text>
          </View>
        </View>
        <BalancePanel metrics={metrics} completed={false} />
        <CatalogToolbar
          selectedCategoryId={selectedCategoryId}
          searchQuery={searchQuery}
          onSelectCategory={setSelectedCategoryId}
          onSearch={setSearchQuery}
        />
        <View className='catalog-layout'>
          <View className='product-grid'>
            {renderedProducts.map((product) => {
              const quantity = quantities[product.id] ?? 0
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={quantity}
                  subtotalUsd={multiplyUsd(product.priceUsd, quantity)}
                  visualSymbol={M5_BENCHMARK_VISUAL_BY_ID.get(product.id) ?? '✦'}
                  readOnly={false}
                  onIncrement={increment}
                  onDecrement={decrement}
                  onMax={max}
                  onSetQuantity={setQuantity}
                />
              )
            })}
          </View>
          <View className='receipt-column'>
            <ReceiptPanel
              receipt={receipt}
              achievementCount={0}
              totalAchievementCount={0}
              productsById={M5_BENCHMARK_PRODUCT_BY_ID}
            />
          </View>
        </View>
      </View>
    </View>
  )
}
