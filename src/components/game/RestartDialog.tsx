import { Text, View } from '@tarojs/components'

import { AccessibleButton as Button } from '../../ui/AccessibleButton'

import { M2_COPY } from '../../i18n/m2'
import { M5_COPY } from '../../i18n/m5'
import { useAccessibleDialog } from '../../platform/use-accessible-dialog'

interface RestartDialogProps {
  readonly open: boolean
  readonly onCancel: () => void
  readonly onConfirm: () => void
}

export function RestartDialog({
  open,
  onCancel,
  onConfirm,
}: RestartDialogProps): JSX.Element | null {
  useAccessibleDialog({
    open,
    dialogId: 'restart-dialog-panel',
    initialFocusId: 'cancel-restart',
    onEscape: onCancel,
  })
  if (!open) return null
  return (
    <View id='restart-dialog' className='dialog-backdrop'>
      <View
        id='restart-dialog-panel'
        className='restart-dialog'
        role='dialog'
        ariaLabel={M5_COPY.restartDialog}
      >
        <Text className='restart-dialog__eyebrow'>{M2_COPY.restartEyebrow}</Text>
        <Text className='restart-dialog__title'>{M2_COPY.restartTitle}</Text>
        <Text className='restart-dialog__body'>{M2_COPY.restartBody}</Text>
        <View className='restart-dialog__actions'>
          <Button
            id='cancel-restart'
            className='dialog-button dialog-button--secondary'
            onClick={onCancel}
          >
            {M2_COPY.cancel}
          </Button>
          <Button
            id='confirm-restart'
            className='dialog-button dialog-button--danger'
            onClick={onConfirm}
          >
            {M2_COPY.confirmRestart}
          </Button>
        </View>
      </View>
    </View>
  )
}
