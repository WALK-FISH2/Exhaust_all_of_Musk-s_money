import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { ClearDataDialog, RestoreDialog } from '../../src/components/game/PersistenceDialogs'
import { ProgressOverview } from '../../src/components/game/ProgressOverview'
import { FreeModeResult } from '../../src/components/game/FreeModeResult'
import { ACHIEVEMENT_DEFINITIONS } from '../../src/data/achievements'
import { createEmptyLocalRecords, updateLocalRecords } from '../../src/domain/records'
import { deriveChallengeResult, deriveResultMetrics } from '../../src/domain/results'
import { buildRunState } from '../helpers/run-fixtures'

vi.mock('@tarojs/components', () => ({
  Button: 'taro-button-core',
  Text: 'taro-text-core',
  View: 'taro-view-core',
}))

describe('M4 persistence and lifetime UI', () => {
  it('renders all formal achievements, lifetime progress, unlock history, and records', () => {
    let records = createEmptyLocalRecords()
    records = updateLocalRecords(records, {
      mode: 'challenge-30',
      totalSpentUsd: 200_000_000_000,
      actualDurationMs: 30_000,
      exactZeroClear: false,
    }).records
    const markup = renderToStaticMarkup(
      createElement(ProgressOverview, {
        lifetimeAchievementIds: ['first-swipe', 'max-button'],
        records,
        currentMode: 'challenge-30',
        onRequestClearData: vi.fn(),
      }),
    )

    expect(markup).toContain('永久成就 2 / 20')
    expect(markup).toContain('解锁记录')
    expect(markup).toContain('$200,000,000,000')
    expect(markup).toContain('id="clear-local-data"')
    ACHIEVEMENT_DEFINITIONS.forEach((definition) => {
      expect(markup).toContain(`id="lifetime-achievement-${definition.id}"`)
      expect(markup).toContain(definition.nameZh)
    })
  })

  it('renders an explicit restore choice only when requested', () => {
    const closed = renderToStaticMarkup(
      createElement(RestoreDialog, {
        open: false,
        onContinue: vi.fn(),
        onRestart: vi.fn(),
      }),
    )
    const open = renderToStaticMarkup(
      createElement(RestoreDialog, {
        open: true,
        onContinue: vi.fn(),
        onRestart: vi.fn(),
      }),
    )
    expect(closed).toBe('')
    expect(open).toContain('id="continue-restored-run"')
    expect(open).toContain('id="restart-restored-run"')
  })

  it('requires a dedicated destructive confirmation before clearing local data', () => {
    const markup = renderToStaticMarkup(
      createElement(ClearDataDialog, {
        open: true,
        onCancel: vi.fn(),
        onConfirm: vi.fn(),
      }),
    )
    expect(markup).toContain('id="clear-data-dialog"')
    expect(markup).toContain('id="cancel-clear-data"')
    expect(markup).toContain('id="confirm-clear-data"')
    expect(markup).toContain('无法撤销')
  })

  it('shows a new-record indicator only for record kinds reported by application state', () => {
    const run = buildRunState({
      mode: 'challenge-30',
      status: 'expired',
      quantities: { 'mars-city': 1 },
    })
    const challengeResult = deriveChallengeResult(run)
    if (challengeResult === null) throw new Error('Expected challenge result')
    const markup = renderToStaticMarkup(
      createElement(FreeModeResult, {
        metrics: deriveResultMetrics(run),
        unlockedAchievementIds: [],
        achievementNamesById: {},
        onPlayAgain: vi.fn(),
        onShowProducts: vi.fn(),
        challengeResult,
        onChangeChallenge: vi.fn(),
        lifetimeAchievementCount: 3,
        totalAchievementCount: 20,
        beatenRecordKinds: ['highest-spending'],
      }),
    )
    expect(markup).toContain('id="new-record-banner"')
    expect(markup).toContain('最高消费')
    expect(markup).toContain('永久成就 3 / 20')
  })
})
