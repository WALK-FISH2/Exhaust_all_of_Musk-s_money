import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { CatalogToolbar } from '../../src/components/game/CatalogToolbar'
import { CATEGORIES } from '../../src/data/categories'

vi.mock('@tarojs/components', () => ({
  Button: 'taro-button-core',
  Input: 'taro-input-core',
  Text: 'taro-text-core',
  View: 'taro-view-core',
}))

describe('CatalogToolbar category rendering', () => {
  it('renders the all control and every formal category control', () => {
    const markup = renderToStaticMarkup(
      createElement(CatalogToolbar, {
        selectedCategoryId: 'all',
        searchQuery: '',
        onSelectCategory: vi.fn(),
        onSearch: vi.fn(),
      }),
    )

    expect(markup).toContain('id="category-all"')
    for (const category of CATEGORIES) {
      expect(markup).toContain(`id="category-${category.id}"`)
      expect(markup).toContain(category.nameZh)
    }

    expect(markup.match(/id="category-[^"]+"/g)).toHaveLength(CATEGORIES.length + 1)
  })
})
