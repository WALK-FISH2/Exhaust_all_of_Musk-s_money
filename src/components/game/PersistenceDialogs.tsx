import { Button, Text, View } from '@tarojs/components'

import { M4_COPY } from '../../i18n/m4'

interface RestoreDialogProps {
  readonly open: boolean
  readonly onContinue: () => void
  readonly onRestart: () => void
}

export function RestoreDialog({
  open,
  onContinue,
  onRestart,
}: RestoreDialogProps): JSX.Element | null {
  if (!open) return null
  return (
    <View id='restore-dialog' className='dialog-backdrop'>
      <View className='dialog-card'>
        <Text className='dialog-card__title'>{M4_COPY.restoreTitle}</Text>
        <Text className='dialog-card__body'>{M4_COPY.restoreBody}</Text>
        <View className='dialog-card__actions'>
          <Button id='restart-restored-run' className='dialog-button' onClick={onRestart}>
            {M4_COPY.restartRun}
          </Button>
          <Button
            id='continue-restored-run'
            className='dialog-button dialog-button--danger'
            onClick={onContinue}
          >
            {M4_COPY.continueRun}
          </Button>
        </View>
      </View>
    </View>
  )
}

interface ClearDataDialogProps {
  readonly open: boolean
  readonly onCancel: () => void
  readonly onConfirm: () => void
}

export function ClearDataDialog({
  open,
  onCancel,
  onConfirm,
}: ClearDataDialogProps): JSX.Element | null {
  if (!open) return null
  return (
    <View id='clear-data-dialog' className='dialog-backdrop'>
      <View className='dialog-card'>
        <Text className='dialog-card__title'>{M4_COPY.clearTitle}</Text>
        <Text className='dialog-card__body'>{M4_COPY.clearBody}</Text>
        <View className='dialog-card__actions'>
          <Button id='cancel-clear-data' className='dialog-button' onClick={onCancel}>
            {M4_COPY.cancel}
          </Button>
          <Button
            id='confirm-clear-data'
            className='dialog-button dialog-button--danger'
            onClick={onConfirm}
          >
            {M4_COPY.confirmClear}
          </Button>
        </View>
      </View>
    </View>
  )
}
