export const M6_COPY = {
  defaultShareTitle: '来挑战花光 $400B',
  shareTitlePrefix: '来挑战',
  shareTitleWithoutRecord: '看看你能花掉多少',
  friendRecord: '好友挑战记录',
} as const

export function formatChallengeRecord(durationMs: number): string {
  return `${(durationMs / 1_000).toFixed(2)} 秒`
}

export function formatChallengeShareTitle(
  durationSeconds: number,
  recordMs: number | null,
): string {
  const detail =
    recordMs === null
      ? M6_COPY.shareTitleWithoutRecord
      : `${M6_COPY.friendRecord} ${formatChallengeRecord(recordMs)}`
  return `${M6_COPY.shareTitlePrefix} ${durationSeconds} 秒：${detail}`
}
