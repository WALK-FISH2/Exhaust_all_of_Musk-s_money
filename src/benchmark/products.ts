import { PRODUCTS } from '../data/products'
import type { ProductDefinition } from '../domain/catalog'
import { getProductVisualAsset } from '../ui/product-visuals'

export const M5_BENCHMARK_PRODUCTS: readonly ProductDefinition[] = Array.from(
  { length: 100 },
  (_, index) => {
    const source = PRODUCTS[index % PRODUCTS.length]!
    const sequence = index + 1
    return {
      ...source,
      id: `benchmark-${String(sequence).padStart(3, '0')}`,
      order: sequence,
      nameZh: `${source.nameZh} 测试 ${sequence}`,
      nameEn: `${source.nameEn} Benchmark ${sequence}`,
      keywords: [...source.keywords, 'benchmark', String(sequence)],
    }
  },
)

export const M5_BENCHMARK_PRODUCT_BY_ID: ReadonlyMap<string, ProductDefinition> = new Map(
  M5_BENCHMARK_PRODUCTS.map((product) => [product.id, product]),
)

export const M5_BENCHMARK_VISUAL_BY_ID: ReadonlyMap<string, string> = new Map(
  M5_BENCHMARK_PRODUCTS.map((product, index) => [
    product.id,
    getProductVisualAsset(PRODUCTS[index % PRODUCTS.length]!).symbol,
  ]),
)
