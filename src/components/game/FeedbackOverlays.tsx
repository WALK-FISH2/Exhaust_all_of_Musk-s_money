import { Button, Text, View } from '@tarojs/components'

import type { AchievementId } from '../../domain/achievement-types'
import { M2_COPY } from '../../i18n/m2'

interface FeedbackBannerProps {
  readonly message: string | null
  readonly onDismiss: () => void
}

export function FeedbackBanner({ message, onDismiss }: FeedbackBannerProps): JSX.Element | null {
  if (message === null) return null
  return (
    <View id='feedback-banner' className='feedback-banner'>
      <Text>{message}</Text>
      <Button className='feedback-banner__dismiss' onClick={onDismiss}>
        ×
      </Button>
    </View>
  )
}

interface AchievementFeedbackProps {
  readonly achievementIds: readonly AchievementId[]
  readonly namesById: Readonly<Record<string, string>>
  readonly onDismiss: () => void
}

export function AchievementFeedback({
  achievementIds,
  namesById,
  onDismiss,
}: AchievementFeedbackProps): JSX.Element | null {
  if (achievementIds.length === 0) return null
  return (
    <View id='achievement-toast' className='achievement-toast'>
      <View className='achievement-toast__icon'>★</View>
      <View className='achievement-toast__copy'>
        <Text className='achievement-toast__label'>{M2_COPY.achievementToast}</Text>
        <Text className='achievement-toast__names'>
          {achievementIds.map((id) => namesById[id] ?? id).join(' · ')}
        </Text>
      </View>
      <Button className='achievement-toast__dismiss' onClick={onDismiss}>
        ×
      </Button>
    </View>
  )
}
