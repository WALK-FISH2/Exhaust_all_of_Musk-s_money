import { Text, View } from '@tarojs/components'

import { AccessibleButton as Button } from '../../ui/AccessibleButton'

import { M5_COPY, MOTION_LABELS } from '../../i18n/m5'
import type { Preferences } from '../../storage/schema'

interface MotionSettingsProps {
  readonly value: Preferences['reducedMotion']
  readonly onChange: (value: Preferences['reducedMotion']) => void
}

const OPTIONS: readonly Preferences['reducedMotion'][] = ['system', 'reduce', 'full']

export function MotionSettings({ value, onChange }: MotionSettingsProps): JSX.Element {
  return (
    <View
      id='motion-settings'
      className='motion-settings'
      role='region'
      ariaLabel={M5_COPY.motionTitle}
    >
      <View>
        <Text className='motion-settings__title'>{M5_COPY.motionTitle}</Text>
        <Text className='motion-settings__hint'>{M5_COPY.motionHint}</Text>
      </View>
      <View className='motion-settings__options'>
        {OPTIONS.map((option) => {
          const selected = value === option
          return (
            <Button
              id={`motion-${option}`}
              key={option}
              className={`motion-option${selected ? ' motion-option--active' : ''}`}
              ariaLabel={`${MOTION_LABELS[option]}${selected ? `，${M5_COPY.selected}` : ''}`}
              onClick={() => onChange(option)}
            >
              {selected ? '✓ ' : ''}
              {MOTION_LABELS[option]}
            </Button>
          )
        })}
      </View>
    </View>
  )
}
