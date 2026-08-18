import { Button, Text, View } from '@tarojs/components'

import { M2_COPY } from '../../i18n/m2'

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
  if (!open) return null
  return (
    <View id='restart-dialog' className='dialog-backdrop'>
      <View className='restart-dialog'>
        <Text className='restart-dialog__eyebrow'>RESET THIS RUN?</Text>
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
