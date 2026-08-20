import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { ProductCard } from '../../src/components/game/ProductCard'
import { PRODUCTS } from '../../src/data/products'

vi.mock('@tarojs/components', () => ({
  Button: 'taro-button-core',
  Input: 'taro-input-core',
  Text: 'taro-text-core',
  View: 'taro-view-core',
}))

describe('ProductCard responsive presentation', () => {
  it('renders the compact-mobile variant with all formal controls and product data', () => {
    const product = PRODUCTS[0]!
    const markup = renderToStaticMarkup(
      createElement(ProductCard, {
        product,
        quantity: 0,
        subtotalUsd: 0,
        readOnly: false,
        onIncrement: vi.fn(),
        onDecrement: vi.fn(),
        onMax: vi.fn(),
        onSetQuantity: vi.fn(),
      }),
    )

    expect(markup).toContain('product-card--compact-mobile')
    expect(markup).toContain(product.nameZh)
    expect(markup).toContain(product.nameEn)
    expect(markup).toContain(`id="decrement-${product.id}"`)
    expect(markup).toContain(`id="quantity-${product.id}"`)
    expect(markup).toContain(`id="increment-${product.id}"`)
    expect(markup).toContain(`id="max-${product.id}"`)
  })
})
