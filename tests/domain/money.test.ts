import { describe, expect, it } from 'vitest'

import {
  INITIAL_BUDGET_USD,
  MoneyError,
  addUsd,
  canAfford,
  formatUsd,
  isNonNegativeSafeInteger,
  multiplyUsd,
  subtractUsd,
  sumUsd,
} from '../../src/domain/money'

describe('integer USD money model', () => {
  it('keeps the $400B baseline as an exact safe integer', () => {
    expect(INITIAL_BUDGET_USD).toBe(400_000_000_000)
    expect(Number.isSafeInteger(INITIAL_BUDGET_USD)).toBe(true)
    expect(formatUsd(INITIAL_BUDGET_USD)).toBe('$400,000,000,000')
  })

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid authoritative money: %s',
    (value) => {
      expect(() => addUsd(value, 0)).toThrowError(MoneyError)
    },
  )

  it('performs safe addition and exact summation', () => {
    expect(addUsd(200_000_000_000, 200_000_000_000)).toBe(INITIAL_BUDGET_USD)
    expect(sumUsd([200_000_000_000, 100_000_000_000, 70_000_000_000, 30_000_000_000])).toBe(
      INITIAL_BUDGET_USD,
    )
    expect(() => addUsd(Number.MAX_SAFE_INTEGER, 1)).toThrowError(
      expect.objectContaining({ code: 'UNSAFE_INTEGER' }),
    )
  })

  it('performs safe subtraction without allowing a negative balance', () => {
    expect(subtractUsd(100, 40)).toBe(60)
    expect(subtractUsd(100, 100)).toBe(0)
    expect(() => subtractUsd(100, 101)).toThrowError(
      expect.objectContaining({ code: 'NEGATIVE_RESULT' }),
    )
  })

  it('performs safe price × quantity multiplication', () => {
    expect(multiplyUsd(50_000_000, 7_999)).toBe(399_950_000_000)
    expect(() => multiplyUsd(Number.MAX_SAFE_INTEGER, 2)).toThrowError(
      expect.objectContaining({ code: 'UNSAFE_INTEGER' }),
    )
  })

  it('checks affordability using exact integers', () => {
    expect(canAfford(100, 100)).toBe(true)
    expect(canAfford(99, 100)).toBe(false)
    expect(isNonNegativeSafeInteger(0)).toBe(true)
  })

  it.each([
    [1, '$1'],
    [1_000, '$1,000'],
    [400_000_000_000, '$400,000,000,000'],
  ])('formats %i without scientific notation', (value, expected) => {
    expect(formatUsd(value)).toBe(expected)
    expect(formatUsd(value)).not.toMatch(/[eE][+-]?\d/)
  })
})
