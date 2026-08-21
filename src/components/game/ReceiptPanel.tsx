import { Text, View } from '@tarojs/components'

import { PRODUCT_BY_ID } from '../../data/products'
import type { ProductDefinition } from '../../domain/catalog'
import { formatIntegerWithGrouping, formatUsd } from '../../domain/money'
import type { Receipt } from '../../domain/receipt'
import { M2_COPY } from '../../i18n/m2'

interface ReceiptPanelProps {
  readonly receipt: Receipt
  readonly achievementCount: number
  readonly totalAchievementCount: number
  readonly productsById?: ReadonlyMap<string, ProductDefinition>
}

export function ReceiptPanel({
  receipt,
  achievementCount,
  totalAchievementCount,
  productsById = PRODUCT_BY_ID,
}: ReceiptPanelProps): JSX.Element {
  return (
    <View id='receipt-panel' className='receipt-panel'>
      <View className='receipt-panel__heading'>
        <Text className='receipt-panel__title'>{M2_COPY.receipt}</Text>
        <Text className='receipt-panel__count'>{receipt.distinctProductCount}</Text>
      </View>
      {receipt.lines.length === 0 ? (
        <Text className='receipt-panel__empty'>{M2_COPY.receiptEmpty}</Text>
      ) : (
        <View className='receipt-lines'>
          {receipt.lines.map((line) => {
            const product = productsById.get(line.productId)
            return (
              <View id={`receipt-${line.productId}`} key={line.productId} className='receipt-line'>
                <View className='receipt-line__name'>
                  <Text>{product?.nameZh ?? line.productId}</Text>
                  <Text className='receipt-line__quantity'>
                    × {formatIntegerWithGrouping(line.quantity)}
                  </Text>
                  <Text className='receipt-line__unit-price'>
                    {M2_COPY.unitPrice} {formatUsd(line.unitPriceUsd)}
                  </Text>
                </View>
                <Text className='receipt-line__subtotal'>{formatUsd(line.subtotalUsd)}</Text>
              </View>
            )
          })}
        </View>
      )}
      <View className='receipt-totals'>
        <View className='receipt-totals__row'>
          <Text>{M2_COPY.distinctProducts}</Text>
          <Text>{formatIntegerWithGrouping(receipt.distinctProductCount)}</Text>
        </View>
        <View className='receipt-totals__row'>
          <Text>{M2_COPY.totalQuantity}</Text>
          <Text>{formatIntegerWithGrouping(receipt.totalQuantity)}</Text>
        </View>
        <View className='receipt-totals__row receipt-totals__row--strong'>
          <Text>{M2_COPY.totalSpent}</Text>
          <Text>{formatUsd(receipt.totalSpentUsd)}</Text>
        </View>
        <View className='receipt-totals__row'>
          <Text>{M2_COPY.remainingBalance}</Text>
          <Text>{formatUsd(receipt.remainingBalanceUsd)}</Text>
        </View>
        <View className='receipt-totals__row receipt-totals__row--achievement'>
          <Text>{M2_COPY.achievements}</Text>
          <Text>
            {achievementCount} / {totalAchievementCount}
          </Text>
        </View>
      </View>
    </View>
  )
}
