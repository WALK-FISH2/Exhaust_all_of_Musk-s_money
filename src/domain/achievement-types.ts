export type AchievementId =
  | 'first-swipe'
  | 'million-warmup'
  | 'billion-click'
  | 'ten-billion'
  | 'hundred-billion'
  | 'exact-zero'
  | 'sticker-finish'
  | 'thousand-items'
  | 'twenty-types'
  | 'five-categories'
  | 'all-categories'
  | 'tech-basket'
  | 'garage-boss'
  | 'island-life'
  | 'sky-office'
  | 'city-maker'
  | 'space-brain'
  | 'max-button'
  | 'challenge-half-30'
  | 'challenge-clear'

export interface AchievementDefinition {
  readonly id: AchievementId
  readonly order: number
  readonly nameKey: string
  readonly nameZh: string
  readonly scope: 'lifetime'
}
