import { Text, View } from '@tarojs/components'

import { AccessibleButton as Button } from '../../ui/AccessibleButton'

import { M5_COPY } from '../../i18n/m5'
import { usePwaStatus } from '../../platform/pwa/use-pwa-status'

export function PwaStatus(): JSX.Element | null {
  const status = usePwaStatus()
  if (!status.supported) return null

  return (
    <View id='pwa-status' className='pwa-status' role='region' ariaLabel={M5_COPY.pwaRegion}>
      <View className='pwa-status__copy'>
        <Text className='pwa-status__state'>
          {status.standalone
            ? `✓ ${M5_COPY.installedApp}`
            : status.online
              ? M5_COPY.onlineNow
              : M5_COPY.offlineNow}
        </Text>
        <Text className='pwa-status__hint'>
          {status.online
            ? status.serviceWorkerReady
              ? M5_COPY.offlineReady
              : M5_COPY.offlinePreparing
            : M5_COPY.offlineNow}
        </Text>
        {status.updateReady ? (
          <Text id='pwa-update-ready' className='pwa-status__update'>
            {M5_COPY.updateReady}
          </Text>
        ) : null}
      </View>
      {status.installState === 'prompt' ? (
        <Button
          id='install-pwa'
          className='pwa-install-button'
          onClick={() => void status.install()}
        >
          {M5_COPY.installApp}
        </Button>
      ) : status.installState === 'menu' ? (
        <Text id='install-pwa-menu-hint' className='pwa-install-instructions'>
          {M5_COPY.installViaMenu}
        </Text>
      ) : status.installState === 'unknown' ? (
        <Text id='install-pwa-unknown' className='pwa-install-instructions'>
          {M5_COPY.installUnknown}
        </Text>
      ) : null}
    </View>
  )
}
