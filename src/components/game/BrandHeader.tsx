import { Button, Text, View } from '@tarojs/components'

import { M2_COPY } from '../../i18n/m2'
import type { RunMode } from '../../domain/game-state'
import { CHALLENGE_MODE_LABELS, M3_COPY } from '../../i18n/m3'

interface BrandHeaderProps {
  readonly mode: RunMode
  readonly onRestart: () => void
  readonly onOpenChallenges: () => void
}

export function BrandHeader({ mode, onRestart, onOpenChallenges }: BrandHeaderProps): JSX.Element {
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
        <View id='current-mode' className='mode-pill'>
          {modeLabel}
        </View>
        <Button id='open-challenge-picker' className='mode-button' onClick={onOpenChallenges}>
          {M3_COPY.challengeMode}
        </Button>
        <Button id='restart-game' className='restart-button' onClick={onRestart}>
          {M2_COPY.restart}
        </Button>
      </View>
      <Text className='brand-header__disclaimer'>{M2_COPY.disclaimer}</Text>
    </View>
  )
}
