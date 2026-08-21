import { Text, View } from '@tarojs/components'

import { AccessibleButton as Button } from '../../ui/AccessibleButton'

import type { ChallengeMode, RunStatus } from '../../domain/game-state'
import { CHALLENGE_MODE_LABELS, M3_COPY } from '../../i18n/m3'
import { formatChallengeRecord, M6_COPY } from '../../i18n/m6'

export function formatChallengeCountdown(remainingMs: number): string {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1_000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

interface ChallengeStatusProps {
  readonly mode: ChallengeMode
  readonly status: RunStatus
  readonly remainingMs: number
  readonly sharedRecordMs?: number | null
  readonly onStart: () => void
  readonly onChangeChallenge: () => void
}

export function ChallengeStatus({
  mode,
  status,
  remainingMs,
  sharedRecordMs = null,
  onStart,
  onChangeChallenge,
}: ChallengeStatusProps): JSX.Element {
  const urgent = status === 'active' && remainingMs <= 10_000
  const sticky = status === 'active'
  return (
    <View
      id='challenge-status'
      className={`challenge-status challenge-status--${status}${sticky ? ' challenge-status--sticky' : ''}${urgent ? ' challenge-status--urgent' : ''}`}
      role='status'
      ariaLabel={`${CHALLENGE_MODE_LABELS[mode]} ${
        status === 'active'
          ? `${M3_COPY.remaining} ${formatChallengeCountdown(remainingMs)}`
          : status === 'ready'
            ? M3_COPY.ready
            : status === 'completed'
              ? M3_COPY.challengeCleared
              : M3_COPY.challengeExpired
      }`}
    >
      <View className='challenge-status__copy'>
        <Text className='challenge-status__mode'>{CHALLENGE_MODE_LABELS[mode]}</Text>
        {status === 'ready' ? (
          <>
            <Text className='challenge-status__state'>{M3_COPY.ready}</Text>
            {sharedRecordMs !== null ? (
              <Text id='shared-challenge-record' className='challenge-status__shared-record'>
                {M6_COPY.friendRecord}：{formatChallengeRecord(sharedRecordMs)}
              </Text>
            ) : null}
          </>
        ) : status === 'active' ? (
          <Text className='challenge-status__state'>{M3_COPY.remaining}</Text>
        ) : (
          <Text className='challenge-status__state'>
            {status === 'completed' ? M3_COPY.challengeCleared : M3_COPY.challengeExpired}
          </Text>
        )}
      </View>
      {status === 'active' ? (
        <Text id='challenge-countdown' className='challenge-status__timer'>
          {formatChallengeCountdown(remainingMs)}
        </Text>
      ) : null}
      {status === 'ready' ? (
        <View className='challenge-status__actions'>
          <Button id='start-challenge' className='challenge-start-button' onClick={onStart}>
            {M3_COPY.start}
          </Button>
          <Button className='challenge-change-button' onClick={onChangeChallenge}>
            {M3_COPY.changeChallenge}
          </Button>
        </View>
      ) : null}
    </View>
  )
}
