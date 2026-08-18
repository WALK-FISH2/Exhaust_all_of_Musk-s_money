import { CNY_DISPLAY_RATE, type RationalDisplayRate } from '../data/config'
import { MoneyError, assertValidUsd, formatIntegerWithGrouping } from './money'

export function convertUsdToApproxCny(
  usd: number,
  rate: RationalDisplayRate = CNY_DISPLAY_RATE,
): number {
  assertValidUsd(usd)
  if (
    !Number.isSafeInteger(rate.numerator) ||
    rate.numerator <= 0 ||
    !Number.isSafeInteger(rate.denominator) ||
    rate.denominator <= 0
  ) {
    throw new MoneyError('INVALID_USD_AMOUNT')
  }
  const scaled = usd * rate.numerator
  if (!Number.isSafeInteger(scaled)) throw new MoneyError('UNSAFE_INTEGER')
  const result = Math.round(scaled / rate.denominator)
  if (!Number.isSafeInteger(result)) throw new MoneyError('UNSAFE_INTEGER')
  return result
}

export function formatApproxCny(usd: number, rate: RationalDisplayRate = CNY_DISPLAY_RATE): string {
  return `≈ ¥${formatIntegerWithGrouping(convertUsdToApproxCny(usd, rate))}（游戏换算）`
}
