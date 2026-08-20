import { Button, Text, View } from '@tarojs/components'

import { ACHIEVEMENT_DEFINITIONS } from '../../data/achievements'
import type { AchievementId } from '../../domain/achievement-types'
import { formatUsd } from '../../domain/money'
import type { ChallengeMode, RunState } from '../../domain/game-state'
import type { LocalRecords } from '../../domain/records'
import { ACHIEVEMENT_DESCRIPTIONS, M4_COPY } from '../../i18n/m4'

interface ProgressOverviewProps {
  readonly lifetimeAchievementIds: readonly AchievementId[]
  readonly records: LocalRecords
  readonly currentMode: RunState['mode']
  readonly onRequestClearData: () => void
}

const RECORD_MODES: readonly { readonly mode: ChallengeMode; readonly label: string }[] = [
  { mode: 'challenge-30', label: '30 秒' },
  { mode: 'challenge-60', label: '60 秒' },
  { mode: 'challenge-300', label: '300 秒' },
]

function formatRecordDuration(durationMs: number): string {
  return `${(durationMs / 1_000).toFixed(2)} 秒`
}

export function ProgressOverview({
  lifetimeAchievementIds,
  records,
  currentMode,
  onRequestClearData,
}: ProgressOverviewProps): JSX.Element {
  const unlocked = new Set(lifetimeAchievementIds)
  return (
    <View id='progress-overview' className='progress-overview'>
      <View className='progress-overview__header'>
        <View>
          <Text className='progress-overview__eyebrow'>{M4_COPY.lifetimeProgress}</Text>
          <Text id='lifetime-progress' className='progress-overview__title'>
            {M4_COPY.lifetimeTitle} {lifetimeAchievementIds.length} /{' '}
            {ACHIEVEMENT_DEFINITIONS.length}
          </Text>
        </View>
        <Button id='clear-local-data' className='clear-data-button' onClick={onRequestClearData}>
          {M4_COPY.clearData}
        </Button>
      </View>

      <View className='achievement-overview-grid'>
        {ACHIEVEMENT_DEFINITIONS.map((definition) => {
          const isUnlocked = unlocked.has(definition.id)
          return (
            <View
              id={`lifetime-achievement-${definition.id}`}
              key={definition.id}
              className={`achievement-overview-card ${
                isUnlocked ? 'achievement-overview-card--unlocked' : ''
              }`}
            >
              <Text className='achievement-overview-card__state'>
                {isUnlocked ? `★ ${M4_COPY.unlocked}` : `○ ${M4_COPY.locked}`}
              </Text>
              <Text className='achievement-overview-card__name'>{definition.nameZh}</Text>
              <Text className='achievement-overview-card__description'>
                {ACHIEVEMENT_DESCRIPTIONS[definition.id]}
              </Text>
            </View>
          )
        })}
      </View>

      <View id='lifetime-unlock-history' className='unlock-history'>
        <Text className='unlock-history__title'>{M4_COPY.unlockHistory}</Text>
        <Text className='unlock-history__items'>
          {lifetimeAchievementIds.length === 0
            ? M4_COPY.noUnlocks
            : lifetimeAchievementIds
                .map(
                  (id, index) =>
                    `${index + 1}. ${
                      ACHIEVEMENT_DEFINITIONS.find((definition) => definition.id === id)?.nameZh ??
                      id
                    }`,
                )
                .join(' · ')}
        </Text>
      </View>

      <View id='local-records' className='local-records'>
        <Text className='local-records__title'>{M4_COPY.recordsTitle}</Text>
        <View className='local-records__grid'>
          {RECORD_MODES.map(({ mode, label }) => {
            const modeRecords = records[mode]
            return (
              <View
                id={`records-${mode}`}
                key={mode}
                className={`local-record-card ${currentMode === mode ? 'local-record-card--current' : ''}`}
              >
                <Text className='local-record-card__mode'>{label}</Text>
                <Text className='local-record-card__line'>
                  {M4_COPY.highestSpending}：
                  {modeRecords.highestSpending
                    ? formatUsd(modeRecords.highestSpending.totalSpentUsd)
                    : M4_COPY.noRecord}
                </Text>
                <Text className='local-record-card__line'>
                  {M4_COPY.fastestClear}：
                  {modeRecords.fastestClear
                    ? formatRecordDuration(modeRecords.fastestClear.actualDurationMs)
                    : M4_COPY.noRecord}
                </Text>
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}
