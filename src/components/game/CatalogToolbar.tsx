import { Button, Input, Text, View } from '@tarojs/components'

import { CATEGORIES } from '../../data/categories'
import { M2_COPY } from '../../i18n/m2'
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
          ✦ {M2_COPY.allCategories}
        </Button>
        {CATEGORIES.map((category) => (
          <Button
            id={`category-${category.id}`}
            key={category.id}
            className={`category-chip${
              selectedCategoryId === category.id ? ' category-chip--active' : ''
            }`}
            onClick={() => onSelectCategory(category.id)}
          >
            {CATEGORY_EMOJI[category.id]} {category.nameZh}
          </Button>
        ))}
      </View>
    </View>
  )
}
