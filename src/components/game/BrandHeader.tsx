import { Text, View } from '@tarojs/components'

import { AccessibleButton as Button } from '../../ui/AccessibleButton'

import { M2_COPY } from '../../i18n/m2'
import type { RunMode } from '../../domain/game-state'
import { CHALLENGE_MODE_LABELS, M3_COPY } from '../../i18n/m3'

interface BrandHeaderProps {
  readonly mode: RunMode
  readonly onRestart: () => void
  readonly onOpenChallenges: () => void
  readonly onReturnToFree: () => void
}

export function BrandHeader({
  mode,
  onRestart,
  onOpenChallenges,
  onReturnToFree,
}: BrandHeaderProps): JSX.Element {
  const modeLabel = mode === 'free' ? M2_COPY.freeMode : CHALLENGE_MODE_LABELS[mode]
  return (
    <View className='brand-header'>
      <View className='brand-header__main'>
        <Text className='brand-header__eyebrow'>
          {mode === 'free' ? M2_COPY.eyebrow : M3_COPY.challengeEyebrow}
        </Text>
        <Text className='brand-header__title'>{M2_COPY.title}</Text>
        <Text className='brand-header__subtitle'>{M2_COPY.subtitle}</Text>
      </View>
      <View className='brand-header__actions'>
        {mode === 'free' ? (
          <View id='current-mode' className='mode-pill'>
            {modeLabel}
          </View>
        ) : (
          <Button
            id='open-current-challenge-picker'
            className='mode-pill'
            onClick={onOpenChallenges}
          >
            {modeLabel}
          </Button>
        )}
        <Button
          id={mode === 'free' ? 'open-challenge-picker' : 'return-to-free-mode'}
          className='mode-button'
          onClick={mode === 'free' ? onOpenChallenges : onReturnToFree}
        >
          {mode === 'free' ? M3_COPY.challengeMode : M3_COPY.backToFree}
        </Button>
        <Button id='restart-game' className='restart-button' onClick={onRestart}>
          {M2_COPY.restart}
        </Button>
      </View>
      <Text className='brand-header__disclaimer'>{M2_COPY.disclaimer}</Text>
    </View>
  )
}
