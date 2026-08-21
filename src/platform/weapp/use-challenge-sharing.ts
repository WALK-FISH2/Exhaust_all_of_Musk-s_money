import Taro from '@tarojs/taro'
import { useEffect, useMemo } from 'react'

import type { RunState } from '../../domain/game-state'
import type { LocalRecords } from '../../domain/records'
import {
  buildWeappShareHandlers,
  createChallengeShareSnapshot,
  parseWeappShareRoute,
  type ChallengeShareRouteParams,
  type WeappShareLanding,
} from './challenge-share'

const IS_WEAPP = process.env.TARO_ENV === 'weapp'

export function useWeappSharing(run: RunState, records: LocalRecords): WeappShareLanding | null {
  const snapshot = useMemo(() => createChallengeShareSnapshot(run, records), [records, run])
  const handlers = useMemo(() => buildWeappShareHandlers(snapshot), [snapshot])
  const router = Taro.useRouter<ChallengeShareRouteParams>()

  Taro.useShareAppMessage(() => handlers.friend)
  Taro.useShareTimeline(() => handlers.timeline)

  useEffect(() => {
    if (!IS_WEAPP) return
    void Taro.showShareMenu({ showShareItems: ['shareAppMessage', 'shareTimeline'] })
  }, [])

  const { shareMode, challengeMode, duration, record } = router.params
  return useMemo(
    () =>
      IS_WEAPP
        ? parseWeappShareRoute({
            shareMode,
            challengeMode,
            duration,
            record,
          })
        : null,
    [challengeMode, duration, record, shareMode],
  )
}
