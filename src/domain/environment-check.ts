export interface EnvironmentCheckResult {
  readonly platform: string
  readonly message: string
  readonly passed: true
}

/**
 * M0-only pure function used to prove that both targets execute one shared domain module.
 * It intentionally contains no game rules or platform API access.
 */
export function runEnvironmentCheck(platform: string): EnvironmentCheckResult {
  const normalizedPlatform = platform.trim() || 'unknown'

  return {
    platform: normalizedPlatform,
    message: `Shared TypeScript domain is available for ${normalizedPlatform}.`,
    passed: true,
  }
}
