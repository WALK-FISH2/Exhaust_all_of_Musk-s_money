import { Button, Text, View } from '@tarojs/components'

import { PRODUCT_BY_ID } from '../../data/products'
import type { AchievementId } from '../../domain/achievement-types'
import { formatIntegerWithGrouping, formatUsd } from '../../domain/money'
import type { ChallengeRunResult, RunResultMetrics } from '../../domain/results'
import { M2_COPY } from '../../i18n/m2'
import { M3_COPY } from '../../i18n/m3'

interface FreeModeResultProps {
  readonly metrics: RunResultMetrics
  readonly unlockedAchievementIds: readonly AchievementId[]
  readonly achievementNamesById: Readonly<Record<string, string>>
  readonly onPlayAgain: () => void
  readonly onShowProducts: () => void
  readonly challengeResult: ChallengeRunResult | null
  readonly onChangeChallenge: () => void
}

function formatElapsedMs(durationMs: number): string {
  return `${(durationMs / 1_000).toFixed(2)} 秒`
}

export function FreeModeResult({
  metrics,
  unlockedAchievementIds,
  achievementNamesById,
  onPlayAgain,
  onShowProducts,
  challengeResult,
  onChangeChallenge,
}: FreeModeResultProps): JSX.Element {
  const highestLine = metrics.highestSubtotalLine
  const highestProduct = highestLine ? PRODUCT_BY_ID.get(highestLine.productId) : undefined

  return (
    <View id={challengeResult ? 'challenge-result' : 'free-mode-result'} className='result-card'>
      <Text className='result-card__eyebrow'>
        {challengeResult
          ? challengeResult.exactZeroClear
            ? M3_COPY.challengeCleared
            : M3_COPY.timeUp
          : M2_COPY.completedEyebrow}
      </Text>
      <Text className='result-card__title'>
        {challengeResult
          ? challengeResult.exactZeroClear
            ? M3_COPY.challengeClearTitle
            : M3_COPY.challengeExpiredTitle
          : M2_COPY.completedTitle}
      </Text>
      <Text className='result-card__summary'>
        {challengeResult
          ? challengeResult.exactZeroClear
            ? M3_COPY.challengeClearSummary
            : M3_COPY.challengeExpiredSummary
          : M2_COPY.completedSummary}
      </Text>
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
        {challengeResult ? (
          <>
            <View className='result-stat'>
              <Text className='result-stat__label'>{M3_COPY.configuredDuration}</Text>
              <Text id='result-challenge-duration' className='result-stat__value'>
                {challengeResult.durationMs / 1_000} 秒
              </Text>
            </View>
            <View className='result-stat'>
              <Text className='result-stat__label'>{M3_COPY.actualDuration}</Text>
              <Text id='result-actual-duration' className='result-stat__value'>
                {formatElapsedMs(challengeResult.actualDurationMs)}
              </Text>
            </View>
            <View className='result-stat'>
              <Text className='result-stat__label'>{M2_COPY.remainingBalance}</Text>
              <Text className='result-stat__value'>{formatUsd(metrics.remainingBalanceUsd)}</Text>
            </View>
          </>
        ) : null}
        <View className='result-stat'>
          <Text className='result-stat__label'>{M2_COPY.totalQuantity}</Text>
          <Text className='result-stat__value'>
            {formatIntegerWithGrouping(metrics.totalQuantity)}
          </Text>
        </View>
        <View className='result-stat'>
          <Text className='result-stat__label'>{M2_COPY.spendingPercent}</Text>
          <Text className='result-stat__value'>{metrics.spendingPercent.toFixed(6)}%</Text>
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
          id={challengeResult ? 'retry-challenge' : 'play-again'}
          className='result-button result-button--primary'
          onClick={onPlayAgain}
        >
          {challengeResult ? M3_COPY.retryChallenge : M2_COPY.playAgain}
        </Button>
        <Button id='back-to-products' className='result-button' onClick={onShowProducts}>
          {M2_COPY.backToProducts}
        </Button>
        {challengeResult ? (
          <Button id='change-challenge' className='result-button' onClick={onChangeChallenge}>
            {M3_COPY.changeChallenge}
          </Button>
        ) : null}
      </View>
    </View>
  )
}
