export type DomainErrorCode =
  | 'UNKNOWN_PRODUCT'
  | 'INVALID_QUANTITY'
  | 'INSUFFICIENT_BALANCE'
  | 'CAP_EXCEEDED'
  | 'GAME_ALREADY_COMPLETED'
  | 'GAME_NOT_ACTIVE'
  | 'OWNED_QUANTITY_EXCEEDED'
  | 'UNSAFE_INTEGER'
  | 'INVALID_RUN_ID'
  | 'INVALID_TIMESTAMP'
  | 'INVALID_STATE'

export interface DomainError {
  readonly code: DomainErrorCode
  readonly productId?: string
}

export type DomainResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: DomainError }

export function domainSuccess<T>(value: T): DomainResult<T> {
  return { ok: true, value }
}

export function domainFailure<T>(code: DomainErrorCode, productId?: string): DomainResult<T> {
  return productId === undefined
    ? { ok: false, error: { code } }
    : { ok: false, error: { code, productId } }
}
