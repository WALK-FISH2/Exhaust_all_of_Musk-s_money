export type ProductKind = 'realistic' | 'aspirational' | 'fantasy'

export interface CategoryDefinition {
  readonly id: string
  readonly nameKey: string
  readonly nameZh: string
  readonly nameEn: string
}

export interface ProductDefinition {
  readonly id: string
  readonly categoryId: string
  readonly order: number
  readonly nameKey: string
  readonly nameZh: string
  readonly nameEn: string
  readonly priceUsd: number
  readonly maxQuantityPerRun: number
  readonly kind: ProductKind
  readonly keywords: readonly string[]
}

export function compareProducts(left: ProductDefinition, right: ProductDefinition): number {
  return left.priceUsd - right.priceUsd || left.order - right.order
}

export function sortProducts(products: readonly ProductDefinition[]): readonly ProductDefinition[] {
  return [...products].sort(compareProducts)
}
