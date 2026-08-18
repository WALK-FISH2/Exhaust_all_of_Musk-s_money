export const INITIAL_BUDGET_USD = 400_000_000_000

export type MoneyErrorCode = 'INVALID_USD_AMOUNT' | 'UNSAFE_INTEGER' | 'NEGATIVE_RESULT'

export class MoneyError extends Error {
  constructor(readonly code: MoneyErrorCode) {
    super(code)
    this.name = 'MoneyError'
  }
}

export function isNonNegativeSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0
}

export function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0
}

export function assertValidUsd(value: number): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new MoneyError('INVALID_USD_AMOUNT')
  }
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError('UNSAFE_INTEGER')
  }
}

export function addUsd(left: number, right: number): number {
  assertValidUsd(left)
  assertValidUsd(right)
  const result = left + right
  if (!Number.isSafeInteger(result)) {
    throw new MoneyError('UNSAFE_INTEGER')
  }
  return result
}

export function subtractUsd(minuend: number, subtrahend: number): number {
  assertValidUsd(minuend)
  assertValidUsd(subtrahend)
  const result = minuend - subtrahend
  if (result < 0) {
    throw new MoneyError('NEGATIVE_RESULT')
  }
  return result
}

export function multiplyUsd(unitPriceUsd: number, quantity: number): number {
  assertValidUsd(unitPriceUsd)
  if (!isNonNegativeSafeInteger(quantity)) {
    throw new MoneyError(
      Number.isFinite(quantity) && Number.isInteger(quantity) && quantity >= 0
        ? 'UNSAFE_INTEGER'
        : 'INVALID_USD_AMOUNT',
    )
  }
  const result = unitPriceUsd * quantity
  if (!Number.isSafeInteger(result)) {
    throw new MoneyError('UNSAFE_INTEGER')
  }
  return result
}

export function sumUsd(values: readonly number[]): number {
  return values.reduce((total, value) => addUsd(total, value), 0)
}

export function canAfford(balanceUsd: number, costUsd: number): boolean {
  assertValidUsd(balanceUsd)
  assertValidUsd(costUsd)
  return costUsd <= balanceUsd
}

export function formatIntegerWithGrouping(value: number): string {
  assertValidUsd(value)
  const digits = String(value)
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function formatUsd(value: number): string {
  return `$${formatIntegerWithGrouping(value)}`
}
