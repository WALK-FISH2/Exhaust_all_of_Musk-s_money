import { Text, View } from '@tarojs/components'

import { AccessibleButton as Button } from '../../ui/AccessibleButton'

import { CHALLENGE_DEFINITIONS } from '../../data/challenges'
import type { RunMode } from '../../domain/game-state'
import { M3_COPY } from '../../i18n/m3'
import { M5_COPY } from '../../i18n/m5'
import { useAccessibleDialog } from '../../platform/use-accessible-dialog'

interface ChallengePickerProps {
  readonly open: boolean
  readonly currentMode: RunMode
  readonly onClose: () => void
  readonly onSelectMode: (mode: RunMode) => void
}

export function ChallengePicker({
  open,
  currentMode,
  onClose,
  onSelectMode,
}: ChallengePickerProps): JSX.Element | null {
  useAccessibleDialog({
    open,
    dialogId: 'challenge-picker-panel',
    initialFocusId: currentMode === 'free' ? 'select-challenge-30' : 'close-challenge-picker',
    onEscape: onClose,
  })
  if (!open) return null
  return (
    <View id='challenge-picker' className='dialog-backdrop'>
      <View
        id='challenge-picker-panel'
        className='challenge-picker'
        role='dialog'
        ariaLabel={M5_COPY.challengeDialog}
      >
        <Text className='challenge-picker__eyebrow'>{M3_COPY.challengeEyebrow}</Text>
        <Text className='challenge-picker__title'>{M3_COPY.chooseChallenge}</Text>
        <Text className='challenge-picker__hint'>{M3_COPY.chooseChallengeHint}</Text>
        <View className='challenge-picker__options'>
          {CHALLENGE_DEFINITIONS.map((definition) => (
            <Button
              id={`select-${definition.mode}`}
              key={definition.mode}
              className={`challenge-option${
                currentMode === definition.mode ? ' challenge-option--current' : ''
              }`}
              onClick={() => onSelectMode(definition.mode)}
            >
              <Text className='challenge-option__duration'>{definition.labelZh}</Text>
              <Text className='challenge-option__caption'>{M3_COPY.challengeOptionHint}</Text>
            </Button>
          ))}
        </View>
        <View className='challenge-picker__actions'>
          {currentMode !== 'free' ? (
            <Button
              id='select-free-mode'
              className='dialog-button'
              onClick={() => onSelectMode('free')}
            >
              {M3_COPY.backToFree}
            </Button>
          ) : null}
          <Button id='close-challenge-picker' className='dialog-button' onClick={onClose}>
            {M3_COPY.closePicker}
          </Button>
        </View>
      </View>
    </View>
  )
}
