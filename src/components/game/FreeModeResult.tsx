import { Button, Text, View } from '@tarojs/components'

import { PRODUCT_BY_ID } from '../../data/products'
import type { AchievementId } from '../../domain/achievement-types'
import { formatIntegerWithGrouping, formatUsd } from '../../domain/money'
import type { RunResultMetrics } from '../../domain/results'
import { M2_COPY } from '../../i18n/m2'

interface FreeModeResultProps {
  readonly metrics: RunResultMetrics
  readonly unlockedAchievementIds: readonly AchievementId[]
  readonly achievementNamesById: Readonly<Record<string, string>>
  readonly onPlayAgain: () => void
  readonly onShowProducts: () => void
}

export function FreeModeResult({
  metrics,
  unlockedAchievementIds,
  achievementNamesById,
  onPlayAgain,
  onShowProducts,
}: FreeModeResultProps): JSX.Element {
  const highestLine = metrics.highestSubtotalLine
  const highestProduct = highestLine ? PRODUCT_BY_ID.get(highestLine.productId) : undefined

  return (
    <View id='free-mode-result' className='result-card'>
      <Text className='result-card__eyebrow'>{M2_COPY.completedEyebrow}</Text>
      <Text className='result-card__title'>{M2_COPY.completedTitle}</Text>
      <Text className='result-card__summary'>{M2_COPY.completedSummary}</Text>
      <View className='result-grid'>
        <View className='result-stat result-stat--hero'>
          <Text className='result-stat__label'>{M2_COPY.wasteIndex}</Text>
          <Text id='result-waste-index' className='result-stat__value'>
            {metrics.wasteIndex} / 100
          </Text>
        </View>
        <View className='result-stat'>
          <Text className='result-stat__label'>{M2_COPY.totalSpent}</Text>
          <Text className='result-stat__value'>{formatUsd(metrics.totalSpentUsd)}</Text>
        </View>
        <View className='result-stat'>
          <Text className='result-stat__label'>{M2_COPY.totalQuantity}</Text>
          <Text className='result-stat__value'>
            {formatIntegerWithGrouping(metrics.totalQuantity)}
          </Text>
        </View>
        <View className='result-stat'>
          <Text className='result-stat__label'>{M2_COPY.distinctProducts}</Text>
          <Text className='result-stat__value'>{metrics.distinctProductCount}</Text>
        </View>
        <View className='result-stat'>
          <Text className='result-stat__label'>{M2_COPY.categoriesTouched}</Text>
          <Text className='result-stat__value'>{metrics.categoriesTouched.length} / 10</Text>
        </View>
        <View className='result-stat result-stat--wide'>
          <Text className='result-stat__label'>{M2_COPY.highestLine}</Text>
          <Text className='result-stat__value'>{highestProduct?.nameZh ?? '—'}</Text>
          {highestLine ? (
            <Text className='result-stat__detail'>{formatUsd(highestLine.subtotalUsd)}</Text>
          ) : null}
        </View>
      </View>
      <View className='result-achievements'>
        <Text className='result-achievements__title'>{M2_COPY.achievements}</Text>
        <View className='result-achievements__list'>
          {unlockedAchievementIds.map((id) => (
            <Text key={id} className='result-achievement'>
              ★ {achievementNamesById[id] ?? id}
            </Text>
          ))}
        </View>
      </View>
      <View className='result-card__actions'>
        <Button
          id='play-again'
          className='result-button result-button--primary'
          onClick={onPlayAgain}
        >
          {M2_COPY.playAgain}
        </Button>
        <Button id='back-to-products' className='result-button' onClick={onShowProducts}>
          {M2_COPY.backToProducts}
        </Button>
      </View>
    </View>
  )
}
