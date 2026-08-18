import { describe, expect, it } from 'vitest'

import { runEnvironmentCheck } from '../../src/domain/environment-check'

describe('runEnvironmentCheck', () => {
  it('returns a deterministic result without platform APIs', () => {
    expect(runEnvironmentCheck('h5')).toEqual({
      platform: 'h5',
      message: 'Shared TypeScript domain is available for h5.',
      passed: true,
    })
  })

  it('normalizes blank platform labels', () => {
    expect(runEnvironmentCheck('  ').platform).toBe('unknown')
  })
})
