import Taro from '@tarojs/taro'
import { useEffect, useMemo } from 'react'

import type { RunState } from '../../domain/game-state'
import type { LocalRecords } from '../../domain/records'
import {
  buildChallengeShareHandlers,
  createChallengeShareSnapshot,
  parseChallengeShareRoute,
  type ChallengeShareRouteParams,
  type ChallengeShareSnapshot,
} from './challenge-share'

const IS_WEAPP = process.env.TARO_ENV === 'weapp'

export function useChallengeSharing(
  run: RunState,
  records: LocalRecords,
): ChallengeShareSnapshot | null {
  const snapshot = useMemo(() => createChallengeShareSnapshot(run, records), [records, run])
  const handlers = useMemo(() => buildChallengeShareHandlers(snapshot), [snapshot])
  const sharingAvailable = snapshot !== null
  const router = Taro.useRouter<ChallengeShareRouteParams>()

  Taro.useShareAppMessage(() => handlers.friend)
  Taro.useShareTimeline(() => handlers.timeline)

  useEffect(() => {
    if (!IS_WEAPP) return
    if (sharingAvailable) {
      void Taro.showShareMenu({ showShareItems: ['shareAppMessage', 'shareTimeline'] })
      return
    }
    void Taro.hideShareMenu()
  }, [sharingAvailable])

  const { challengeMode, duration, record } = router.params
  return useMemo(
    () =>
      IS_WEAPP
        ? parseChallengeShareRoute({
            challengeMode,
            duration,
            record,
          })
        : null,
    [challengeMode, duration, record],
  )
}
