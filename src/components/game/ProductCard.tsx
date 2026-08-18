import { Button, Input, Text, View } from '@tarojs/components'
import { memo, useEffect, useState } from 'react'

import type { ProductCardViewModel } from '../../application/free-mode-controller'
import { formatApproxCny } from '../../domain/currency-display'
import { formatIntegerWithGrouping, formatUsd } from '../../domain/money'
import { M2_COPY } from '../../i18n/m2'
import { CATEGORY_EMOJI } from '../../ui/category-visuals'

interface ProductCardProps extends ProductCardViewModel {
  readonly readOnly: boolean
  readonly onIncrement: (productId: string) => void
  readonly onDecrement: (productId: string) => void
  readonly onMax: (productId: string) => void
  readonly onSetQuantity: (productId: string, rawQuantity: string) => void
}

function ProductCardComponent({
  product,
  quantity,
  subtotalUsd,
  readOnly,
  onIncrement,
  onDecrement,
  onMax,
  onSetQuantity,
}: ProductCardProps): JSX.Element {
  const [quantityDraft, setQuantityDraft] = useState(String(quantity))

  useEffect(() => {
    setQuantityDraft(String(quantity))
  }, [quantity])

  const commitQuantity = () => {
    onSetQuantity(product.id, quantityDraft)
  }

  return (
    <View id={`product-${product.id}`} className='product-card'>
      <View className={`product-card__visual product-card__visual--${product.categoryId}`}>
        <Text className='product-card__emoji'>{CATEGORY_EMOJI[product.categoryId]}</Text>
        <Text className='product-card__kind'>{product.kind}</Text>
      </View>
      <View className='product-card__content'>
        <Text className='product-card__name'>{product.nameZh}</Text>
        <Text className='product-card__name-en'>{product.nameEn}</Text>
        <View className='product-card__price-row'>
          <View>
            <Text className='product-card__micro-label'>{M2_COPY.unitPrice}</Text>
            <Text className='product-card__price'>{formatUsd(product.priceUsd)}</Text>
          </View>
          <Text className='product-card__cny'>{formatApproxCny(product.priceUsd)}</Text>
        </View>
        <View className='product-card__control-row'>
          <Button
            id={`decrement-${product.id}`}
            className='quantity-button'
            ariaLabel={`${product.nameZh} ${M2_COPY.decrement}`}
            disabled={readOnly || quantity === 0}
            onClick={() => onDecrement(product.id)}
          >
            −
          </Button>
          <Input
            id={`quantity-${product.id}`}
            className='quantity-input'
            type='number'
            ariaLabel={`${product.nameZh} ${M2_COPY.quantityInput}`}
            value={quantityDraft}
            disabled={readOnly}
            onInput={(event) => setQuantityDraft(event.detail.value)}
            onBlur={commitQuantity}
          />
          <Button
            id={`increment-${product.id}`}
            className='quantity-button'
            ariaLabel={`${product.nameZh} ${M2_COPY.increment}`}
            disabled={readOnly || quantity >= product.maxQuantityPerRun}
            onClick={() => onIncrement(product.id)}
          >
            +
          </Button>
          <Button
            id={`max-${product.id}`}
            className='max-button'
            ariaLabel={`${product.nameZh} ${M2_COPY.max}`}
            disabled={readOnly || quantity >= product.maxQuantityPerRun}
            onClick={() => onMax(product.id)}
          >
            {M2_COPY.max}
          </Button>
        </View>
        <View className='product-card__summary'>
          <Text>
            {M2_COPY.owned} {formatIntegerWithGrouping(quantity)}
          </Text>
          <Text>
            {M2_COPY.perRunCap} {formatIntegerWithGrouping(product.maxQuantityPerRun)}
          </Text>
        </View>
        <View className='product-card__subtotal'>
          <Text>{M2_COPY.subtotal}</Text>
          <Text>{formatUsd(subtotalUsd)}</Text>
        </View>
      </View>
    </View>
  )
}

export const ProductCard = memo(ProductCardComponent)
