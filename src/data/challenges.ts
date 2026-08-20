import type { ChallengeMode } from '../domain/game-state'

export interface ChallengeDefinition {
  readonly mode: ChallengeMode
  readonly durationMs: number
  readonly labelZh: string
}

export const CHALLENGE_DEFINITIONS = [
  { mode: 'challenge-30', durationMs: 30_000, labelZh: '30 秒' },
  { mode: 'challenge-60', durationMs: 60_000, labelZh: '60 秒' },
  { mode: 'challenge-300', durationMs: 300_000, labelZh: '300 秒' },
] as const satisfies readonly ChallengeDefinition[]

export const CHALLENGE_DURATION_MS: Readonly<Record<ChallengeMode, number>> = {
  'challenge-30': 30_000,
  'challenge-60': 60_000,
  'challenge-300': 300_000,
}

export function getChallengeDurationMs(mode: ChallengeMode): number {
  return CHALLENGE_DURATION_MS[mode]
}
