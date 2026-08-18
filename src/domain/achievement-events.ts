export type DomainCommandKind =
  'purchase' | 'increment' | 'decrement' | 'set-quantity' | 'max' | 'challenge-completed'

export type ChallengeOutcome = 'cleared-before-deadline' | 'expired'

export interface DomainTransitionEvent {
  readonly commandKind: DomainCommandKind
  readonly productId: string | null
  readonly quantityDelta: number
  readonly balanceBeforeUsd: number
  readonly balanceAfterUsd: number
  readonly timestamp: number
  readonly challengeOutcome: ChallengeOutcome | null
}
