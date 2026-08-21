import { Input, Text, View } from '@tarojs/components'
import { memo, useEffect, useRef, useState } from 'react'

import { AccessibleButton as Button } from '../../ui/AccessibleButton'
import type { ProductCardViewModel } from '../../application/free-mode-controller'
import { formatApproxCny } from '../../domain/currency-display'
import { formatIntegerWithGrouping, formatUsd } from '../../domain/money'
import { M2_COPY } from '../../i18n/m2'
import { getProductVisualAsset } from '../../ui/product-visuals'

export type PurchaseFeedbackLevel = 'none' | 'pulse' | 'strong' | 'burst'

export function classifyPurchaseFeedback(deltaUsd: number): PurchaseFeedbackLevel {
  if (deltaUsd >= 10_000_000_000) return 'burst'
  if (deltaUsd >= 1_000_000_000) return 'strong'
  if (deltaUsd >= 1_000_000) return 'pulse'
  return 'none'
}

export function getProductControlLayoutClass(taroEnvironment: string | undefined): string {
  return taroEnvironment === 'weapp' ? ' product-card--weapp-controls' : ''
}

interface ProductCardProps extends ProductCardViewModel {
  readonly readOnly: boolean
  readonly visualSymbol?: string
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
  visualSymbol,
  onIncrement,
  onDecrement,
  onMax,
  onSetQuantity,
}: ProductCardProps): JSX.Element {
  const [quantityDraft, setQuantityDraft] = useState(String(quantity))
  const [purchaseFeedback, setPurchaseFeedback] = useState<PurchaseFeedbackLevel>('none')
  const previousSubtotalUsd = useRef(subtotalUsd)
  const resolvedVisualSymbol = visualSymbol ?? getProductVisualAsset(product).symbol
  const platformControlClass = getProductControlLayoutClass(process.env.TARO_ENV)

  useEffect(() => {
    setQuantityDraft(String(quantity))
  }, [quantity])

  useEffect(() => {
    const deltaUsd = subtotalUsd - previousSubtotalUsd.current
    previousSubtotalUsd.current = subtotalUsd
    const nextFeedback = classifyPurchaseFeedback(deltaUsd)
    if (deltaUsd <= 0) {
      setPurchaseFeedback('none')
      return undefined
    }
    setPurchaseFeedback(nextFeedback)
    const timer = setTimeout(() => setPurchaseFeedback('none'), nextFeedback === 'none' ? 180 : 460)
    return () => clearTimeout(timer)
  }, [subtotalUsd])

  const commitQuantity = () => {
    onSetQuantity(product.id, quantityDraft)
  }

  return (
    <View
      id={`product-${product.id}`}
      className={`product-card product-card--compact-mobile product-card--feedback-${purchaseFeedback}${platformControlClass}`}
      role='group'
      ariaLabel={product.nameZh}
    >
      <View className={`product-card__visual product-card__visual--${product.categoryId}`}>
        <Text className='product-card__mark'>{resolvedVisualSymbol}</Text>
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
            ariaLabel={`${product.nameZh} ${M2_COPY.quantityInput}，当前 ${quantity}`}
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
        <Text className='product-card__summary'>
          {M2_COPY.owned} {formatIntegerWithGrouping(quantity)} · {M2_COPY.perRunCap}{' '}
          {formatIntegerWithGrouping(product.maxQuantityPerRun)}
        </Text>
        <View className='product-card__subtotal'>
          <Text>{M2_COPY.subtotal}</Text>
          <Text>{formatUsd(subtotalUsd)}</Text>
        </View>
      </View>
    </View>
  )
}

export const ProductCard = memo(ProductCardComponent)
