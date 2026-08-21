import type { ChallengeMode } from '../domain/game-state'

export const CHALLENGE_MODE_LABELS: Readonly<Record<ChallengeMode, string>> = {
  'challenge-30': '30 秒挑战',
  'challenge-60': '60 秒挑战',
  'challenge-300': '300 秒挑战',
}

export const M3_COPY = {
  challengeMode: '挑战模式',
  challengeEyebrow: 'CHALLENGE MODE · DEADLINE COUNTS',
  challengeOptionHint: '明确开始 · deadline 计时',
  chooseChallenge: '选择挑战时长',
  chooseChallengeHint: '选择时长不会开始计时。准备好后再点击“开始挑战”。',
  closePicker: '暂不挑战',
  backToFree: '返回自由模式',
  ready: '准备阶段 · 计时尚未开始',
  readyHint: '点击开始后立即进入可购买状态，倒计时从那一刻计算。',
  start: '开始挑战',
  remaining: '剩余时间',
  timeUp: '时间到',
  challengeCleared: '挑战成功 · $400B 已清零',
  challengeExpired: '时间到，购买已冻结',
  challengeClearTitle: '余额归零，手速比数字更离谱。',
  challengeExpiredTitle: '时间到，先看看你烧掉了多少。',
  challengeClearSummary: '你在截止时间前精确花光了全部预算。',
  challengeExpiredSummary: '倒计时已经结束，本局商品和收据仅供查看。',
  configuredDuration: '挑战时长',
  actualDuration: '实际耗时',
  retryChallenge: '再挑战一次',
  changeChallenge: '换个挑战',
  completedReadOnly: '挑战已结束 · 商品仅供查看',
} as const
