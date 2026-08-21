export const M6_COPY = {
  freeShareTitle: '来试试花光 4000 亿美元，你会买什么？',
  challengeShareWithoutRecordSuffix: '秒花钱挑战：你能花掉多少？',
  challengeShareRecordPrefix: '我在',
  challengeShareRecordMiddle: '秒挑战中留下了',
  challengeShareRecordSuffix: '的记录，你能超过我吗？',
  friendRecord: '好友挑战记录',
} as const

export function formatChallengeRecord(durationMs: number): string {
  return `${(durationMs / 1_000).toFixed(2)} 秒`
}

export function formatChallengeShareTitle(
  durationSeconds: number,
  recordMs: number | null,
): string {
  return recordMs === null
    ? `${durationSeconds} ${M6_COPY.challengeShareWithoutRecordSuffix}`
    : `${M6_COPY.challengeShareRecordPrefix} ${durationSeconds} ${M6_COPY.challengeShareRecordMiddle} ${formatChallengeRecord(recordMs)}${M6_COPY.challengeShareRecordSuffix}`
}
