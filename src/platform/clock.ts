export interface Clock {
  now(): number
}

export const SYSTEM_CLOCK: Clock = Object.freeze({
  now: () => Date.now(),
})
