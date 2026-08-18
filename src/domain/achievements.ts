import { ACHIEVEMENT_DEFINITIONS } from '../data/achievements'
import { CATEGORIES } from '../data/categories'
import { PRODUCTS } from '../data/products'
import type { AchievementId } from './achievement-types'
import type { DomainTransitionEvent } from './achievement-events'
import { getProductQuantity, type RunState } from './game-state'
import { deriveResultMetrics } from './results'

export interface AchievementEvaluationContext {
  readonly beforeState: RunState
  readonly afterState: RunState
  readonly event: DomainTransitionEvent
}

type AchievementRule = (context: AchievementEvaluationContext) => boolean

function countProductsInCategory(state: RunState, categoryId: string): number {
  return PRODUCTS.filter(
    (product) => product.categoryId === categoryId && getProductQuantity(state, product.id) > 0,
  ).length
}

function isRunEnd(state: RunState): boolean {
  return state.status === 'completed' || state.status === 'expired'
}

const ACHIEVEMENT_RULES: Readonly<Record<AchievementId, AchievementRule>> = {
  'first-swipe': ({ afterState }) => deriveResultMetrics(afterState).totalSpentUsd >= 1,
  'million-warmup': ({ afterState }) => deriveResultMetrics(afterState).totalSpentUsd >= 1_000_000,
  'billion-click': ({ afterState }) =>
    deriveResultMetrics(afterState).totalSpentUsd >= 1_000_000_000,
  'ten-billion': ({ afterState }) =>
    deriveResultMetrics(afterState).totalSpentUsd >= 10_000_000_000,
  'hundred-billion': ({ afterState }) =>
    deriveResultMetrics(afterState).totalSpentUsd >= 100_000_000_000,
  'exact-zero': ({ afterState }) => deriveResultMetrics(afterState).remainingBalanceUsd === 0,
  'sticker-finish': ({ event }) =>
    (event.commandKind === 'purchase' ||
      event.commandKind === 'increment' ||
      event.commandKind === 'set-quantity' ||
      event.commandKind === 'max') &&
    event.productId === 'lucky-sticker' &&
    event.quantityDelta === 1 &&
    event.balanceBeforeUsd === 1 &&
    event.balanceAfterUsd === 0,
  'thousand-items': ({ afterState }) => deriveResultMetrics(afterState).totalQuantity >= 1_000,
  'twenty-types': ({ afterState }) => deriveResultMetrics(afterState).distinctProductCount >= 20,
  'five-categories': ({ afterState }) =>
    deriveResultMetrics(afterState).categoriesTouched.length >= 5,
  'all-categories': ({ afterState }) =>
    deriveResultMetrics(afterState).categoriesTouched.length === CATEGORIES.length,
  'tech-basket': ({ afterState }) => countProductsInCategory(afterState, 'tech') >= 4,
  'garage-boss': ({ afterState }) => countProductsInCategory(afterState, 'vehicles') >= 4,
  'island-life': ({ afterState }) => getProductQuantity(afterState, 'private-island') >= 1,
  'sky-office': ({ afterState }) => getProductQuantity(afterState, 'private-jet') >= 1,
  'city-maker': ({ afterState }) =>
    getProductQuantity(afterState, 'smart-town') >= 1 ||
    getProductQuantity(afterState, 'skyscraper') >= 1,
  'space-brain': ({ afterState }) => countProductsInCategory(afterState, 'space') >= 3,
  'max-button': ({ event }) => event.commandKind === 'max' && event.quantityDelta > 0,
  'challenge-half-30': ({ afterState }) =>
    afterState.mode === 'challenge-30' &&
    isRunEnd(afterState) &&
    deriveResultMetrics(afterState).spendingPercent >= 50,
  'challenge-clear': ({ afterState, event }) =>
    afterState.mode !== 'free' &&
    deriveResultMetrics(afterState).remainingBalanceUsd === 0 &&
    event.challengeOutcome === 'cleared-before-deadline',
}

export function evaluateAchievements(
  context: AchievementEvaluationContext,
): readonly AchievementId[] {
  return ACHIEVEMENT_DEFINITIONS.filter((definition) =>
    ACHIEVEMENT_RULES[definition.id](context),
  ).map((definition) => definition.id)
}

export function calculateNewAchievementUnlocks(
  context: AchievementEvaluationContext,
  alreadyUnlockedIds: readonly AchievementId[],
): readonly AchievementId[] {
  const alreadyUnlocked = new Set<AchievementId>(alreadyUnlockedIds)
  return evaluateAchievements(context).filter((id) => !alreadyUnlocked.has(id))
}
