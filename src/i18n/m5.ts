import type { Preferences } from '../storage/schema'

export const M5_COPY = {
  motionTitle: '动效偏好',
  motionHint: '只影响视觉反馈，不改变金额、成就、存档或挑战计时。',
  motionSystem: '跟随系统',
  motionReduce: '减少动效',
  motionFull: '完整动效',
  selected: '已选择',
  installApp: '安装 PWA 应用',
  installedApp: '已在独立应用模式运行',
  installViaMenu: '当前未检测到网页内安装提示，可尝试通过浏览器菜单安装。',
  installUnknown: '当前环境暂时无法确认安装方式，请查看浏览器的应用或安装选项。',
  offlineReady: '离线应用壳已就绪',
  offlinePreparing: '正在准备离线应用壳',
  offlineNow: '当前离线，本地游戏仍可继续',
  onlineNow: '当前在线',
  updateReady: '新版本已下载，将在关闭所有游戏窗口后的安全时机启用。',
  pwaRegion: 'PWA 安装与离线状态',
  searchLabel: '搜索商品',
  challengeDialog: '选择挑战时长',
  restartDialog: '重新开始当前游戏',
  restoreDialog: '恢复上次游戏',
  clearDataDialog: '清除全部本地游戏数据',
} as const

export const MOTION_LABELS: Readonly<Record<Preferences['reducedMotion'], string>> = {
  system: M5_COPY.motionSystem,
  reduce: M5_COPY.motionReduce,
  full: M5_COPY.motionFull,
}

export const M5_BENCHMARK_COPY = {
  eyebrow: 'M5 WEAPP RUNTIME BENCHMARK',
  title: '100 商品运行时验证',
  hint: '仅在条件编译的开发者工具 benchmark 构建中启用，不修改正式 45 商品目录。',
  visibleProducts: '当前展示商品数',
  renderedProducts: '已提交商品数',
  totalProducts: '测试商品总数',
  totalSpent: '测试消费',
} as const

export type ResultCopyContext = 'free-complete' | 'challenge-complete' | 'challenge-expired'

export const RESULT_COPY_TEMPLATES: Readonly<Record<ResultCopyContext, readonly string[]>> = {
  'free-complete': [
    '购物车已经抵达数字尽头，余额负责安静地归零。',
    '四千亿美元全部找到去处，收据比计划更有耐心。',
    '这一局没有真实交易，只有一个非常完整的零。',
  ],
  'challenge-complete': [
    '截止线还没追上你，余额已经先一步消失。',
    '计时器仍在工作，但购物车已经完成全部任务。',
    '你把精确计算和手速一起塞进了这张收据。',
  ],
  'challenge-expired': [
    '倒计时准时收工，购物车保留了最后的战况。',
    '时间没有被后台暂停，收据也没有替你加班。',
    '这一轮被冻结了，下一轮还能继续挑战数字。',
  ],
}

export function selectResultCopy(context: ResultCopyContext, seed: number): string {
  const templates = RESULT_COPY_TEMPLATES[context]
  const index = Math.abs(Math.trunc(seed)) % templates.length
  return templates[index]!
}
