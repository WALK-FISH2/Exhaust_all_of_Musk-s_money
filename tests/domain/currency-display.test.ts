import { describe, expect, it } from 'vitest'

import { CNY_DISPLAY_RATE } from '../../src/data/config'
import { convertUsdToApproxCny, formatApproxCny } from '../../src/domain/currency-display'
import { createRun, deriveRunTotals } from '../../src/domain/game-state'
import { INITIAL_BUDGET_USD } from '../../src/domain/money'

describe('display-only CNY conversion', () => {
  it('uses the frozen 7.20 rational display rate', () => {
    expect(CNY_DISPLAY_RATE).toEqual({ numerator: 720, denominator: 100 })
    expect(convertUsdToApproxCny(INITIAL_BUDGET_USD)).toBe(2_880_000_000_000)
    expect(formatApproxCny(INITIAL_BUDGET_USD)).toBe('≈ ¥2,880,000,000,000（游戏换算）')
  })

  it('rounds display output without writing CNY into RunState', () => {
    expect(convertUsdToApproxCny(1)).toBe(7)
    const run = createRun({ id: 'cny-is-display-only', mode: 'free', timestamp: 1 })
    expect(run.ok).toBe(true)
    if (!run.ok) return

    const before = deriveRunTotals(run.value)
    convertUsdToApproxCny(before.remainingBalanceUsd)
    expect(deriveRunTotals(run.value)).toEqual(before)
    expect('cny' in run.value).toBe(false)
  })
})
