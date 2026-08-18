export const CATALOG_VERSION = 2

export interface RationalDisplayRate {
  readonly numerator: number
  readonly denominator: number
}

export const CNY_DISPLAY_RATE: RationalDisplayRate = Object.freeze({
  numerator: 720,
  denominator: 100,
})
