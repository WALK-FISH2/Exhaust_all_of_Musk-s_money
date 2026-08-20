import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { ChallengePicker } from '../../src/components/game/ChallengePicker'
import {
  ChallengeStatus,
  formatChallengeCountdown,
} from '../../src/components/game/ChallengeStatus'
import { FreeModeResult } from '../../src/components/game/FreeModeResult'
import { deriveChallengeResult, deriveResultMetrics } from '../../src/domain/results'
import { buildRunState } from '../helpers/run-fixtures'

vi.mock('@tarojs/components', () => ({
  Button: 'taro-button-core',
  Text: 'taro-text-core',
  View: 'taro-view-core',
}))

describe('challenge UI composition', () => {
  it('renders all formal duration choices without starting one', () => {
    const markup = renderToStaticMarkup(
      createElement(ChallengePicker, {
        open: true,
        currentMode: 'free',
        onClose: vi.fn(),
        onSelectMode: vi.fn(),
      }),
    )
    expect(markup).toContain('id="select-challenge-30"')
    expect(markup).toContain('id="select-challenge-60"')
    expect(markup).toContain('id="select-challenge-300"')
    expect(markup).not.toContain('id="start-challenge"')
  })

  it('renders ready start and active timestamp-derived countdown states', () => {
    const ready = renderToStaticMarkup(
      createElement(ChallengeStatus, {
        mode: 'challenge-30',
        status: 'ready',
        remainingMs: 30_000,
        onStart: vi.fn(),
        onChangeChallenge: vi.fn(),
      }),
    )
    expect(ready).toContain('id="start-challenge"')
    expect(ready).not.toContain('id="challenge-countdown"')

    const active = renderToStaticMarkup(
      createElement(ChallengeStatus, {
        mode: 'challenge-300',
        status: 'active',
        remainingMs: 299_001,
        onStart: vi.fn(),
        onChangeChallenge: vi.fn(),
      }),
    )
    expect(active).toContain('id="challenge-countdown"')
    expect(active).toContain('05:00')
    expect(formatChallengeCountdown(10_000)).toBe('00:10')
    expect(formatChallengeCountdown(9_001)).toBe('00:10')
    expect(formatChallengeCountdown(0)).toBe('00:00')
  })

  it('renders expired challenge results with retry, read-only return, and change actions', () => {
    const run = buildRunState({
      mode: 'challenge-30',
      status: 'expired',
      quantities: { 'mars-city': 1 },
    })
    const challengeResult = deriveChallengeResult(run)
    if (challengeResult === null) throw new Error('Expected challenge result fixture')
    const markup = renderToStaticMarkup(
      createElement(FreeModeResult, {
        metrics: deriveResultMetrics(run),
        unlockedAchievementIds: run.runUnlockedAchievementIds,
        achievementNamesById: {},
        onPlayAgain: vi.fn(),
        onShowProducts: vi.fn(),
        challengeResult,
        onChangeChallenge: vi.fn(),
      }),
    )
    expect(markup).toContain('id="challenge-result"')
    expect(markup).toContain('id="retry-challenge"')
    expect(markup).toContain('id="back-to-products"')
    expect(markup).toContain('id="change-challenge"')
    expect(markup).toContain('30.00 秒')
  })
})
