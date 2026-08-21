import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { createFreeModeUiState, freeModeReducer } from '../../src/application/free-mode-controller'
import { BrandHeader } from '../../src/components/game/BrandHeader'
import { ChallengeStatus } from '../../src/components/game/ChallengeStatus'
import { getProductControlLayoutClass } from '../../src/components/game/ProductCard'
import { createEmptyLocalRecords } from '../../src/domain/records'
import {
  buildChallengeShareHandlers,
  createChallengeShareSnapshot,
  parseChallengeShareRoute,
} from '../../src/platform/weapp/challenge-share'
import { buildRunState } from '../helpers/run-fixtures'

vi.mock('@tarojs/components', () => ({
  Button: 'taro-button-core',
  Input: 'taro-input-core',
  Text: 'taro-text-core',
  View: 'taro-view-core',
}))

describe('M6 WeChat sharing and challenge UX', () => {
  it('builds identical friend/timeline mode, duration, and best-record parameters', () => {
    const run = buildRunState({ mode: 'challenge-60', status: 'ready' })
    const empty = createEmptyLocalRecords()
    const records = {
      ...empty,
      'challenge-60': {
        highestSpending: null,
        fastestClear: {
          mode: 'challenge-60' as const,
          totalSpentUsd: 400_000_000_000,
          actualDurationMs: 12_438,
          exactZeroClear: true,
        },
      },
    }
    const snapshot = createChallengeShareSnapshot(run, records)
    expect(snapshot).toEqual({
      mode: 'challenge-60',
      durationSeconds: 60,
      recordMs: 12_438,
    })

    const handlers = buildChallengeShareHandlers(snapshot)
    const expectedQuery = 'challengeMode=challenge-60&duration=60&record=12438'
    expect(handlers.friend.path).toBe(`/pages/index/index?${expectedQuery}`)
    expect(handlers.timeline.query).toBe(expectedQuery)
    expect(handlers.friend.title).toContain('好友挑战记录 12.44 秒')
    expect(handlers.timeline.title).toBe(handlers.friend.title)
  })

  it('turns a valid shared challenge into the existing ready state without starting time', () => {
    const landing = parseChallengeShareRoute({
      challengeMode: 'challenge-300',
      duration: '300',
      record: '287654',
    })
    expect(landing).toEqual({
      mode: 'challenge-300',
      durationSeconds: 300,
      recordMs: 287_654,
    })
    if (landing === null) throw new Error('Expected a valid shared challenge')

    const initial = createFreeModeUiState('shared-source', 1_000)
    const ready = freeModeReducer(initial, {
      type: 'select-mode',
      mode: landing.mode,
      runId: 'shared-ready',
      timestamp: 2_000,
    })
    expect(ready.run).toMatchObject({
      mode: 'challenge-300',
      status: 'ready',
      startedAt: null,
      deadlineAt: null,
      durationMs: null,
    })
  })

  it('ignores invalid mode/duration pairs and drops only an invalid optional record', () => {
    expect(
      parseChallengeShareRoute({ challengeMode: 'challenge-30', duration: '60', record: '1' }),
    ).toBeNull()
    expect(
      parseChallengeShareRoute({
        challengeMode: 'challenge-30',
        duration: '30',
        record: '30001',
      }),
    ).toEqual({ mode: 'challenge-30', durationSeconds: 30, recordMs: null })
  })

  it('renders the requested Free/challenge header actions and active-only sticky status', () => {
    const freeHeader = renderToStaticMarkup(
      createElement(BrandHeader, {
        mode: 'free',
        onRestart: vi.fn(),
        onOpenChallenges: vi.fn(),
        onReturnToFree: vi.fn(),
      }),
    )
    expect(freeHeader).toContain('自由模式')
    expect(freeHeader).toContain('挑战模式')
    expect(freeHeader).toContain('重新开始')

    const challengeHeader = renderToStaticMarkup(
      createElement(BrandHeader, {
        mode: 'challenge-30',
        onRestart: vi.fn(),
        onOpenChallenges: vi.fn(),
        onReturnToFree: vi.fn(),
      }),
    )
    expect(challengeHeader).toContain('id="open-current-challenge-picker"')
    expect(challengeHeader).toContain('30 秒挑战')
    expect(challengeHeader).toContain('id="return-to-free-mode"')
    expect(challengeHeader).toContain('返回自由模式')
    expect(challengeHeader).not.toContain('>挑战模式<')

    const ready = renderToStaticMarkup(
      createElement(ChallengeStatus, {
        mode: 'challenge-30',
        status: 'ready',
        remainingMs: 30_000,
        sharedRecordMs: 12_438,
        onStart: vi.fn(),
        onChangeChallenge: vi.fn(),
      }),
    )
    expect(ready).toContain('准备阶段 · 计时尚未开始')
    expect(ready).toContain('开始挑战')
    expect(ready).toContain('换个挑战')
    expect(ready).toContain('好友挑战记录：12.44 秒')
    expect(ready).not.toContain('challenge-status--sticky')

    const active = renderToStaticMarkup(
      createElement(ChallengeStatus, {
        mode: 'challenge-30',
        status: 'active',
        remainingMs: 28_000,
        onStart: vi.fn(),
        onChangeChallenge: vi.fn(),
      }),
    )
    expect(active).toContain('challenge-status--sticky')
    expect(active).toContain('剩余时间')
    expect(active).toContain('00:28')
    expect(active).not.toContain('开始挑战')

    const completed = renderToStaticMarkup(
      createElement(ChallengeStatus, {
        mode: 'challenge-30',
        status: 'completed',
        remainingMs: 0,
        onStart: vi.fn(),
        onChangeChallenge: vi.fn(),
      }),
    )
    expect(completed).not.toContain('challenge-status--sticky')
  })

  it('keeps H5 controls unchanged and emits the inline square MAX WeChat layout', () => {
    expect(getProductControlLayoutClass('h5')).toBe('')
    expect(getProductControlLayoutClass('weapp')).toBe(' product-card--weapp-controls')

    const styles = readFileSync('src/pages/index/index.scss', 'utf8')
    expect(styles).toContain('grid-template-columns: 40px minmax(68px, 1fr) 40px 64px;')
    expect(styles).toContain(
      '.product-card--compact-mobile.product-card--weapp-controls .product-card__control-row',
    )
    expect(styles).toContain('grid-template-columns: 68px minmax(80px, 1fr) 68px 88px;')
    expect(styles).toContain('grid-column: auto;')
    expect(styles).toContain('width: 88px;')

    const shareHook = readFileSync('src/platform/weapp/use-challenge-sharing.ts', 'utf8')
    expect(shareHook).toContain('Taro.useShareAppMessage')
    expect(shareHook).toContain('Taro.useShareTimeline')
    expect(shareHook).toContain("showShareItems: ['shareAppMessage', 'shareTimeline']")
    expect(shareHook).toContain('Taro.hideShareMenu()')
  })
})
