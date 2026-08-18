import type { StorageAdapter } from './storage-adapter'
import { M0StorageRepository, type M0StorageTestRecord } from './m0-storage-repository'

export interface StorageProbeResult {
  readonly passed: boolean
  readonly completedSteps: readonly string[]
  readonly errorMessage?: string
}

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export async function runM0StorageProbe(
  storage: StorageAdapter,
  key = 'm0-storage-test',
): Promise<StorageProbeResult> {
  const completedSteps: string[] = []
  const repository = new M0StorageRepository(storage, key)

  try {
    await repository.clear()
    completedSteps.push('cleanup-before')

    const missingValue = await repository.load()
    if (missingValue !== null) {
      throw new Error('Expected a missing key to return null.')
    }
    completedSteps.push('missing-read')

    const initialPayload: M0StorageTestRecord = {
      schemaVersion: 1,
      source: 'm0-storage-probe',
      revision: 1,
    }
    await repository.save(initialPayload)
    completedSteps.push('set')

    const storedPayload = await repository.load()
    if (storedPayload?.revision !== 1) {
      throw new Error('Stored JSON payload could not be read back.')
    }
    completedSteps.push('get-json')

    const updatedPayload: M0StorageTestRecord = { ...initialPayload, revision: 2 }
    await repository.save(updatedPayload)
    const overwrittenPayload = await repository.load()
    if (overwrittenPayload?.revision !== 2) {
      throw new Error('Stored value could not be overwritten.')
    }
    completedSteps.push('overwrite')

    await repository.clear()
    if ((await repository.load()) !== null) {
      throw new Error('Stored value could not be removed.')
    }
    completedSteps.push('remove')

    return { passed: true, completedSteps }
  } catch (error) {
    return {
      passed: false,
      completedSteps,
      errorMessage: asErrorMessage(error),
    }
  }
}
