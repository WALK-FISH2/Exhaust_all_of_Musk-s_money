import { Text, View } from '@tarojs/components'

import { formatApproxCny } from '../../domain/currency-display'
import { formatUsd } from '../../domain/money'
import type { RunResultMetrics } from '../../domain/results'
import { M2_COPY } from '../../i18n/m2'

interface BalancePanelProps {
  readonly metrics: RunResultMetrics
  readonly completed: boolean
}

export function BalancePanel({ metrics, completed }: BalancePanelProps): JSX.Element {
  const progressWidth = `${Math.min(100, Math.max(0, metrics.spendingPercent))}%`

  return (
    <View
      className={`balance-panel${completed ? ' balance-panel--completed' : ''}`}
      role='region'
      ariaLabel={M2_COPY.balanceRegion}
    >
      <View className='balance-panel__primary'>
        <Text className='balance-panel__label'>{M2_COPY.remaining}</Text>
        <Text
          id='balance-value'
          key={metrics.remainingBalanceUsd}
          className='balance-panel__value balance-panel__value--changed'
        >
          {formatUsd(metrics.remainingBalanceUsd)}
        </Text>
        <Text className='balance-panel__cny'>{formatApproxCny(metrics.remainingBalanceUsd)}</Text>
      </View>
      <View className='balance-panel__progress-area'>
        <View className='balance-panel__spent-row'>
          <Text>{M2_COPY.spent}</Text>
          <Text id='spent-value'>{formatUsd(metrics.totalSpentUsd)}</Text>
        </View>
        <View className='progress-track' role='progressbar' ariaLabel={M2_COPY.progress}>
          <View className='progress-track__fill' style={{ width: progressWidth }} />
        </View>
        <View className='balance-panel__spent-row balance-panel__spent-row--muted'>
          <Text>{M2_COPY.progress}</Text>
          <Text id='progress-value'>{metrics.spendingPercent.toFixed(6)}%</Text>
        </View>
      </View>
    </View>
  )
}
