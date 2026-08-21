import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { createFreeModeUiState, freeModeReducer } from '../../src/application/free-mode-controller'
import { MotionSettings } from '../../src/components/game/MotionSettings'
import { classifyPurchaseFeedback, ProductCard } from '../../src/components/game/ProductCard'
import { RestartDialog } from '../../src/components/game/RestartDialog'
import { PRODUCTS } from '../../src/data/products'
import { RESULT_COPY_TEMPLATES, selectResultCopy } from '../../src/i18n/m5'

vi.mock('@tarojs/components', () => ({
  Button: 'taro-button-core',
  Input: 'taro-input-core',
  Text: 'taro-text-core',
  View: 'taro-view-core',
}))

describe('M5 presentation and accessibility behavior', () => {
  it('classifies decorative purchase feedback without changing game state', () => {
    expect(classifyPurchaseFeedback(999_999)).toBe('none')
    expect(classifyPurchaseFeedback(1_000_000)).toBe('pulse')
    expect(classifyPurchaseFeedback(1_000_000_000)).toBe('strong')
    expect(classifyPurchaseFeedback(10_000_000_000)).toBe('burst')
  })

  it('renders the registered visual mark and descriptive quantity controls', () => {
    const product = PRODUCTS[0]!
    const markup = renderToStaticMarkup(
      createElement(ProductCard, {
        product,
        quantity: 2,
        subtotalUsd: 2,
        readOnly: false,
        onIncrement: vi.fn(),
        onDecrement: vi.fn(),
        onMax: vi.fn(),
        onSetQuantity: vi.fn(),
      }),
    )

    expect(markup).toContain('product-card__mark')
    expect(markup).toContain('贴纸')
    expect(markup).toContain(`${product.nameZh} 增加 1 个`)
    expect(markup).toContain(`${product.nameZh} 直接设置数量，当前 2`)
    expect(markup).toContain('role="button"')
    expect(markup).toContain('tabIndex="0"')
    expect(markup).toContain('aria-disabled="false"')
    expect(markup).not.toMatch(/taro-button-core[^>]*\sdisabled="false"/)
  })

  it('persists a selected reduced-motion value and marks it with text', () => {
    const initial = createFreeModeUiState('m5-motion', 1_000)
    const reduced = freeModeReducer(initial, { type: 'set-reduced-motion', value: 'reduce' })
    expect(reduced.preferences.reducedMotion).toBe('reduce')
    expect(reduced.persistenceRevision).toBe(initial.persistenceRevision + 1)
    expect(freeModeReducer(reduced, { type: 'set-reduced-motion', value: 'reduce' })).toBe(reduced)

    const markup = renderToStaticMarkup(
      createElement(MotionSettings, { value: 'reduce', onChange: vi.fn() }),
    )
    expect(markup).toContain('id="motion-reduce"')
    expect(markup).toContain('✓ 减少动效')
    expect(markup).toContain('减少动效，已选择')
  })

  it('exposes dialog semantics and a safe initial cancel action', () => {
    const markup = renderToStaticMarkup(
      createElement(RestartDialog, { open: true, onCancel: vi.fn(), onConfirm: vi.fn() }),
    )
    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('ariaLabel="重新开始当前游戏"')
    expect(markup).toContain('id="cancel-restart"')
  })

  it('selects deterministic centralized result copy', () => {
    for (const context of Object.keys(RESULT_COPY_TEMPLATES) as Array<
      keyof typeof RESULT_COPY_TEMPLATES
    >) {
      expect(selectResultCopy(context, 42)).toBe(selectResultCopy(context, 42))
      expect(RESULT_COPY_TEMPLATES[context]).toContain(selectResultCopy(context, 42))
    }
  })
})
