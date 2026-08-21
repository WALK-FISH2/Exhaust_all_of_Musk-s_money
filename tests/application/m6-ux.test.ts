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
  buildWeappShareHandlers,
  createChallengeShareSnapshot,
  parseChallengeShareRoute,
  parseWeappShareRoute,
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

    const handlers = buildWeappShareHandlers(snapshot)
    const expectedQuery = 'challengeMode=challenge-60&duration=60&record=12438'
    expect(handlers.friend.path).toBe(`/pages/index/index?${expectedQuery}`)
    expect(handlers.timeline.query).toBe(expectedQuery)
    expect(handlers.friend.title).toContain('60 秒挑战中留下了 12.44 秒的记录')
    expect(handlers.timeline.title).toBe(handlers.friend.title)
  })

  it('builds a progress-free Free Mode share and lands in a new Free run', () => {
    const records = createEmptyLocalRecords()
    const freeRun = buildRunState({ mode: 'free', quantities: { 'lucky-sticker': 99 } })
    expect(createChallengeShareSnapshot(freeRun, records)).toBeNull()

    const handlers = buildWeappShareHandlers(null)
    expect(handlers.friend.path).toBe('/pages/index/index?shareMode=free')
    expect(handlers.timeline.query).toBe('shareMode=free')
    expect(handlers.friend.title).toBe('来试试花光 4000 亿美元，你会买什么？')
    expect(handlers.friend.path).not.toMatch(/challengeMode|duration|record|quantity|balance/i)

    const landing = parseWeappShareRoute({ shareMode: 'free' })
    expect(landing).toEqual({ kind: 'free', mode: 'free' })
    if (landing === null) throw new Error('Expected a valid Free Mode landing')

    let recipient = createFreeModeUiState('recipient-current', 1_000)
    recipient = freeModeReducer(recipient, {
      type: 'increment',
      productId: 'lucky-sticker',
      timestamp: 1_001,
    })
    recipient = freeModeReducer(recipient, {
      type: 'select-mode',
      mode: landing.mode,
      runId: 'pending-shared-free',
      timestamp: 2_000,
    })
    expect(recipient.restartConfirmationOpen).toBe(true)
    expect(recipient.pendingMode).toBe('free')

    recipient = freeModeReducer(recipient, {
      type: 'confirm-restart',
      runId: 'shared-free-new-run',
      timestamp: 2_001,
    })
    expect(recipient.run).toMatchObject({
      id: 'shared-free-new-run',
      mode: 'free',
      status: 'active',
    })
    expect(recipient.run.quantities).toEqual({})
  })

  it('turns a valid shared challenge into the existing ready state without starting time', () => {
    const landing = parseWeappShareRoute({
      challengeMode: 'challenge-300',
      duration: '300',
      record: '287654',
    })
    expect(landing).toEqual({
      kind: 'challenge',
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
    expect(
      parseWeappShareRoute({
        shareMode: 'free',
        challengeMode: 'challenge-30',
        duration: '30',
      }),
    ).toBeNull()
  })

  it('renders the requested Free/challenge header actions and ready/active sticky status', () => {
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
    expect(ready).toContain('challenge-status--sticky')

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

    const page = readFileSync('src/pages/index/index.tsx', 'utf8')
    expect(page).toContain('{isChallengeMode(state.run.mode) ? (')
  })

  it('stacks ready/active Challenge Status below the independent sticky balance panel', () => {
    const styles = readFileSync('src/pages/index/index.scss', 'utf8')
    const balanceStickyBlock = styles.match(/\.balance-panel \{([\s\S]*?)\n\}/)?.[1]
    const challengeStickyBlock = styles.match(/\.challenge-status--sticky \{([\s\S]*?)\n\}/)?.[1]
    expect(styles).toContain('$sticky-balance-height: 180px;')
    expect(styles).toContain('$mobile-sticky-balance-height: 230px;')
    expect(balanceStickyBlock).toContain('position: sticky;')
    expect(balanceStickyBlock).toContain('z-index: 30;')
    expect(challengeStickyBlock).toContain('position: sticky;')
    expect(challengeStickyBlock).toContain(
      'top: $sticky-viewport-top + $sticky-balance-height + $sticky-stack-gap;',
    )
    expect(styles).toContain(
      'top: $mobile-sticky-viewport-top + $mobile-sticky-balance-height + $mobile-sticky-stack-gap;',
    )
    expect(styles).toContain('min-height: 131px;')
    expect(challengeStickyBlock).not.toContain('fixed')
    expect(challengeStickyBlock).not.toContain('absolute')
    expect(challengeStickyBlock).not.toContain('transform')
  })

  it('keeps H5 controls unchanged and emits the compact inline MAX WeChat layout', () => {
    expect(getProductControlLayoutClass('h5')).toBe('')
    expect(getProductControlLayoutClass('weapp')).toBe(' product-card--weapp-controls')

    const styles = readFileSync('src/pages/index/index.scss', 'utf8')
    expect(styles).toContain('grid-template-columns: 40px minmax(68px, 1fr) 40px 64px;')
    expect(styles).toContain(
      '.product-card--compact-mobile.product-card--weapp-controls .product-card__control-row',
    )
    expect(styles).toContain('grid-template-columns: 56px minmax(72px, 112px) 56px 76px;')
    expect(styles).toContain('column-gap: 10px;')
    expect(styles).toContain('row-gap: 0;')
    expect(styles).toContain('margin-top: 6px;')
    expect(styles).toContain('justify-content: center;')
    expect(styles).toContain('grid-column: auto;')
    expect(styles).toContain('min-height: 48px;')
    expect(styles).toContain('width: calc(100% - 16px);')
    expect(styles).toContain('width: 76px;')
    expect(styles).toContain('height: 48px;')
    expect(styles).not.toContain('height: 88px;')

    const shareHook = readFileSync('src/platform/weapp/use-challenge-sharing.ts', 'utf8')
    expect(shareHook).toContain('Taro.useShareAppMessage')
    expect(shareHook).toContain('Taro.useShareTimeline')
    expect(shareHook).toContain("showShareItems: ['shareAppMessage', 'shareTimeline']")
    expect(shareHook).not.toContain('Taro.hideShareMenu()')
  })

  it('keeps the WeChat quantity input and adjacent buttons separated at target widths', () => {
    const rowWidthRpx = 56 + 112 + 56 + 76 + 10 * 3
    const inputToIncrementGapRpx = 10 + 16 / 2
    const incrementToMaxGapRpx = 10
    const targetWidths = [
      { viewportPx: 390, availableRowWidthRpx: 330 },
      { viewportPx: 360, availableRowWidthRpx: 330 },
      { viewportPx: 320, availableRowWidthRpx: 704 },
    ] as const

    for (const { viewportPx, availableRowWidthRpx } of targetWidths) {
      const pxPerRpx = viewportPx / 750

      expect(rowWidthRpx).toBeLessThanOrEqual(availableRowWidthRpx)
      expect(inputToIncrementGapRpx * pxPerRpx).toBeGreaterThan(7)
      expect(incrementToMaxGapRpx * pxPerRpx).toBeGreaterThan(4)
    }
  })
})
