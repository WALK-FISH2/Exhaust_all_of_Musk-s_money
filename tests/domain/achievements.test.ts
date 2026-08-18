import { describe, expect, it } from 'vitest'

import { ACHIEVEMENT_DEFINITIONS } from '../../src/data/achievements'
import { PRODUCTS } from '../../src/data/products'
import type { AchievementId } from '../../src/domain/achievement-types'
import {
  calculateNewAchievementUnlocks,
  evaluateAchievements,
  type AchievementEvaluationContext,
} from '../../src/domain/achievements'
import { purchaseProduct } from '../../src/domain/commands'
import { buildRunState, buildTransitionEvent, EXACT_ZERO_QUANTITIES } from '../helpers/run-fixtures'

const EMPTY = buildRunState()

const ONE_DOLLAR_REMAINING_QUANTITIES: Readonly<Record<string, number>> = {
  'orbital-ring-study': 1,
  'mars-city': 1,
  'lunar-base': 2,
  'ocean-cleanup': 1,
  'football-club': 1,
  'solar-farm': 1,
  'moon-trip': 1,
  'lucky-sticker': 999_999_999,
}

function context(
  afterState: ReturnType<typeof buildRunState>,
  eventOverrides: Parameters<typeof buildTransitionEvent>[2] = {},
  beforeState = EMPTY,
): AchievementEvaluationContext {
  return {
    beforeState,
    afterState,
    event: buildTransitionEvent(beforeState, afterState, eventOverrides),
  }
}

function quantitiesForProducts(count: number): Readonly<Record<string, number>> {
  return Object.fromEntries(PRODUCTS.slice(0, count).map((product) => [product.id, 1]))
}

const categoryRepresentatives = [
  'lucky-sticker',
  'bubble-tea',
  'flagship-phone',
  'ebike',
  'city-apartment',
  'designer-watch',
  'around-world',
  'movie-night',
  'factory',
  'moon-trip',
] as const

function quantitiesForCategories(count: number): Readonly<Record<string, number>> {
  return Object.fromEntries(categoryRepresentatives.slice(0, count).map((id) => [id, 1]))
}

interface AchievementRuleCases {
  readonly id: AchievementId
  readonly trigger: AchievementEvaluationContext
  readonly nonTrigger: AchievementEvaluationContext
  readonly boundary: AchievementEvaluationContext
}

const exactZero = buildRunState({ quantities: EXACT_ZERO_QUANTITIES })
const oneDollarRemaining = buildRunState({ quantities: ONE_DOLLAR_REMAINING_QUANTITIES })
const stickerFinish = buildRunState({
  quantities: { ...ONE_DOLLAR_REMAINING_QUANTITIES, 'lucky-sticker': 1_000_000_000 },
})
const stickerEvent = {
  commandKind: 'purchase' as const,
  productId: 'lucky-sticker',
  quantityDelta: 1,
  balanceBeforeUsd: 1,
  balanceAfterUsd: 0,
}

const achievementCases: readonly AchievementRuleCases[] = [
  {
    id: 'first-swipe',
    trigger: context(buildRunState({ quantities: { 'lucky-sticker': 2 } })),
    nonTrigger: context(EMPTY),
    boundary: context(buildRunState({ quantities: { 'lucky-sticker': 1 } })),
  },
  {
    id: 'million-warmup',
    trigger: context(buildRunState({ quantities: { 'lucky-sticker': 1_000_001 } })),
    nonTrigger: context(buildRunState({ quantities: { 'lucky-sticker': 999_999 } })),
    boundary: context(buildRunState({ quantities: { 'lucky-sticker': 1_000_000 } })),
  },
  {
    id: 'billion-click',
    trigger: context(
      buildRunState({ quantities: { 'lucky-sticker': 1_000_000_000, 'bottled-water': 1 } }),
    ),
    nonTrigger: context(buildRunState({ quantities: { 'lucky-sticker': 999_999_999 } })),
    boundary: context(buildRunState({ quantities: { 'lucky-sticker': 1_000_000_000 } })),
  },
  {
    id: 'ten-billion',
    trigger: context(
      buildRunState({ quantities: { 'football-club': 1, 'theme-park': 1, 'lucky-sticker': 1 } }),
    ),
    nonTrigger: context(buildRunState({ quantities: { 'football-club': 1 } })),
    boundary: context(buildRunState({ quantities: { 'football-club': 1, 'theme-park': 1 } })),
  },
  {
    id: 'hundred-billion',
    trigger: context(buildRunState({ quantities: { 'mars-city': 1, 'lucky-sticker': 1 } })),
    nonTrigger: context(buildRunState({ quantities: { 'lunar-base': 2, 'ocean-cleanup': 1 } })),
    boundary: context(buildRunState({ quantities: { 'mars-city': 1 } })),
  },
  {
    id: 'exact-zero',
    trigger: context(exactZero),
    nonTrigger: context(oneDollarRemaining),
    boundary: context(exactZero),
  },
  {
    id: 'sticker-finish',
    trigger: context(stickerFinish, stickerEvent, oneDollarRemaining),
    nonTrigger: context(stickerFinish, { ...stickerEvent, quantityDelta: 2 }, oneDollarRemaining),
    boundary: context(stickerFinish, stickerEvent, oneDollarRemaining),
  },
  {
    id: 'thousand-items',
    trigger: context(buildRunState({ quantities: { 'lucky-sticker': 1_001 } })),
    nonTrigger: context(buildRunState({ quantities: { 'lucky-sticker': 999 } })),
    boundary: context(buildRunState({ quantities: { 'lucky-sticker': 1_000 } })),
  },
  {
    id: 'twenty-types',
    trigger: context(buildRunState({ quantities: quantitiesForProducts(21) })),
    nonTrigger: context(buildRunState({ quantities: quantitiesForProducts(19) })),
    boundary: context(buildRunState({ quantities: quantitiesForProducts(20) })),
  },
  {
    id: 'five-categories',
    trigger: context(buildRunState({ quantities: quantitiesForCategories(6) })),
    nonTrigger: context(buildRunState({ quantities: quantitiesForCategories(4) })),
    boundary: context(buildRunState({ quantities: quantitiesForCategories(5) })),
  },
  {
    id: 'all-categories',
    trigger: context(buildRunState({ quantities: quantitiesForCategories(10) })),
    nonTrigger: context(buildRunState({ quantities: quantitiesForCategories(9) })),
    boundary: context(buildRunState({ quantities: quantitiesForCategories(10) })),
  },
  {
    id: 'tech-basket',
    trigger: context(
      buildRunState({
        quantities: { 'flagship-phone': 1, 'gaming-pc': 1, 'home-cinema': 1, 'robot-lab': 1 },
      }),
    ),
    nonTrigger: context(
      buildRunState({ quantities: { 'flagship-phone': 1, 'gaming-pc': 1, 'home-cinema': 1 } }),
    ),
    boundary: context(
      buildRunState({
        quantities: { 'flagship-phone': 1, 'gaming-pc': 1, 'home-cinema': 1, 'robot-lab': 1 },
      }),
    ),
  },
  {
    id: 'garage-boss',
    trigger: context(
      buildRunState({
        quantities: { ebike: 1, 'family-car': 1, 'sports-car': 1, 'armored-limo': 1 },
      }),
    ),
    nonTrigger: context(
      buildRunState({ quantities: { ebike: 1, 'family-car': 1, 'sports-car': 1 } }),
    ),
    boundary: context(
      buildRunState({
        quantities: { ebike: 1, 'family-car': 1, 'sports-car': 1, 'armored-limo': 1 },
      }),
    ),
  },
  {
    id: 'island-life',
    trigger: context(buildRunState({ quantities: { 'private-island': 1 } })),
    nonTrigger: context(EMPTY),
    boundary: context(buildRunState({ quantities: { 'private-island': 1 } })),
  },
  {
    id: 'sky-office',
    trigger: context(buildRunState({ quantities: { 'private-jet': 1 } })),
    nonTrigger: context(EMPTY),
    boundary: context(buildRunState({ quantities: { 'private-jet': 1 } })),
  },
  {
    id: 'city-maker',
    trigger: context(buildRunState({ quantities: { 'smart-town': 1 } })),
    nonTrigger: context(EMPTY),
    boundary: context(buildRunState({ quantities: { skyscraper: 1 } })),
  },
  {
    id: 'space-brain',
    trigger: context(
      buildRunState({ quantities: { 'moon-trip': 1, 'rocket-launch': 1, 'lunar-base': 1 } }),
    ),
    nonTrigger: context(buildRunState({ quantities: { 'moon-trip': 1, 'rocket-launch': 1 } })),
    boundary: context(
      buildRunState({ quantities: { 'moon-trip': 1, 'rocket-launch': 1, 'lunar-base': 1 } }),
    ),
  },
  {
    id: 'max-button',
    trigger: context(buildRunState({ quantities: { 'bubble-tea': 1 } }), {
      commandKind: 'max',
      productId: 'bubble-tea',
      quantityDelta: 1,
    }),
    nonTrigger: context(buildRunState({ quantities: { 'bubble-tea': 1 } }), {
      commandKind: 'set-quantity',
      productId: 'bubble-tea',
      quantityDelta: 1,
    }),
    boundary: context(buildRunState({ quantities: { 'bubble-tea': 1 } }), {
      commandKind: 'max',
      productId: 'bubble-tea',
      quantityDelta: 1,
    }),
  },
  {
    id: 'challenge-half-30',
    trigger: context(
      buildRunState({
        mode: 'challenge-30',
        status: 'expired',
        quantities: { 'orbital-ring-study': 1, 'lucky-sticker': 1 },
      }),
    ),
    nonTrigger: context(
      buildRunState({ mode: 'challenge-30', status: 'expired', quantities: { 'mars-city': 1 } }),
    ),
    boundary: context(
      buildRunState({
        mode: 'challenge-30',
        status: 'expired',
        quantities: { 'orbital-ring-study': 1 },
      }),
    ),
  },
  {
    id: 'challenge-clear',
    trigger: context(buildRunState({ mode: 'challenge-30', quantities: EXACT_ZERO_QUANTITIES }), {
      commandKind: 'challenge-completed',
      challengeOutcome: 'cleared-before-deadline',
    }),
    nonTrigger: context(
      buildRunState({ mode: 'challenge-30', quantities: EXACT_ZERO_QUANTITIES }),
      { commandKind: 'challenge-completed', challengeOutcome: 'expired' },
    ),
    boundary: context(buildRunState({ mode: 'challenge-300', quantities: EXACT_ZERO_QUANTITIES }), {
      commandKind: 'challenge-completed',
      challengeOutcome: 'cleared-before-deadline',
    }),
  },
]

describe('achievement definitions and evaluator', () => {
  it('encodes all 20 formal achievements in stable table order', () => {
    expect(ACHIEVEMENT_DEFINITIONS).toHaveLength(20)
    expect(new Set(ACHIEVEMENT_DEFINITIONS.map((definition) => definition.id)).size).toBe(20)
    expect(ACHIEVEMENT_DEFINITIONS.map((definition) => definition.order)).toEqual(
      [...ACHIEVEMENT_DEFINITIONS.map((definition) => definition.order)].sort((a, b) => a - b),
    )
  })

  it.each(achievementCases)('$id triggers for its positive case', ({ id, trigger }) => {
    expect(evaluateAchievements(trigger)).toContain(id)
  })

  it.each(achievementCases)('$id does not trigger for its negative case', ({ id, nonTrigger }) => {
    expect(evaluateAchievements(nonTrigger)).not.toContain(id)
  })

  it.each(achievementCases)('$id handles its qualifying boundary', ({ id, boundary }) => {
    expect(evaluateAchievements(boundary)).toContain(id)
  })

  it('returns newly unlocked achievements once and in definition order', () => {
    const evaluated = evaluateAchievements(context(exactZero))
    const newUnlocks = calculateNewAchievementUnlocks(context(exactZero), [evaluated[0]!])
    expect(newUnlocks).toEqual(evaluated.slice(1))
    expect(newUnlocks).toEqual(
      [...newUnlocks].sort(
        (left, right) =>
          ACHIEVEMENT_DEFINITIONS.findIndex((definition) => definition.id === left) -
          ACHIEVEMENT_DEFINITIONS.findIndex((definition) => definition.id === right),
      ),
    )
  })
})

describe('sticker-finish regression', () => {
  it('unlocks through a real final $1 purchase transition', () => {
    const result = purchaseProduct(oneDollarRemaining, {
      productId: 'lucky-sticker',
      quantity: 1,
      timestamp: 2_000,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.event).toEqual(
      expect.objectContaining({
        productId: 'lucky-sticker',
        quantityDelta: 1,
        balanceBeforeUsd: 1,
        balanceAfterUsd: 0,
      }),
    )
    expect(result.value.newlyUnlockedAchievementIds).toContain('sticker-finish')
  })

  it.each([
    { productId: 'lucky-sticker', quantityDelta: 2, balanceBeforeUsd: 2, balanceAfterUsd: 0 },
    { productId: 'bottled-water', quantityDelta: 1, balanceBeforeUsd: 2, balanceAfterUsd: 0 },
    { productId: 'lucky-sticker', quantityDelta: 1, balanceBeforeUsd: 2, balanceAfterUsd: 1 },
    { productId: 'lucky-sticker', quantityDelta: -1, balanceBeforeUsd: 0, balanceAfterUsd: 1 },
    {
      productId: 'lucky-sticker',
      quantityDelta: 1,
      balanceBeforeUsd: 1,
      balanceAfterUsd: 0,
      commandKind: 'decrement' as const,
    },
  ])('does not unlock for invalid final-sticker event %#', (event) => {
    const evaluated = evaluateAchievements(
      context(stickerFinish, { commandKind: 'purchase', ...event }, oneDollarRemaining),
    )
    expect(evaluated).not.toContain('sticker-finish')
  })
})
