import { Input, Text, View } from '@tarojs/components'

import { AccessibleButton as Button } from '../../ui/AccessibleButton'

import { CATEGORIES } from '../../data/categories'
import { M2_COPY } from '../../i18n/m2'
import { M5_COPY } from '../../i18n/m5'
import { CATEGORY_EMOJI } from '../../ui/category-visuals'

interface CatalogToolbarProps {
  readonly selectedCategoryId: string
  readonly searchQuery: string
  readonly onSelectCategory: (categoryId: string) => void
  readonly onSearch: (query: string) => void
}

export function CatalogToolbar({
  selectedCategoryId,
  searchQuery,
  onSelectCategory,
  onSearch,
}: CatalogToolbarProps): JSX.Element {
  return (
    <View className='catalog-toolbar'>
      <View className='catalog-toolbar__heading'>
        <View>
          <Text className='section-title'>{M2_COPY.products}</Text>
          <Text className='section-hint'>{M2_COPY.productsHint}</Text>
        </View>
        <Input
          id='product-search'
          className='catalog-search'
          value={searchQuery}
          placeholder={M2_COPY.searchPlaceholder}
          ariaLabel={M5_COPY.searchLabel}
          confirmType='search'
          onInput={(event) => onSearch(event.detail.value)}
        />
      </View>
      <View className='category-list'>
        <Button
          id='category-all'
          className={`category-chip${selectedCategoryId === 'all' ? ' category-chip--active' : ''}`}
          onClick={() => onSelectCategory('all')}
        >
          {selectedCategoryId === 'all' ? '✓ ' : '✦ '}
          {M2_COPY.allCategories}
        </Button>
        {CATEGORIES.map((category) => {
          const selected = selectedCategoryId === category.id
          return (
            <Button
              id={`category-${category.id}`}
              key={category.id}
              className={`category-chip${selected ? ' category-chip--active' : ''}`}
              ariaLabel={`${category.nameZh}${selected ? `，${M5_COPY.selected}` : ''}`}
              onClick={() => onSelectCategory(category.id)}
            >
              {selected ? '✓ ' : `${CATEGORY_EMOJI[category.id]} `}
              {category.nameZh}
            </Button>
          )
        })}
      </View>
    </View>
  )
}
