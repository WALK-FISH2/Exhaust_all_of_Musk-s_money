import { Button } from '@tarojs/components'
import type { ButtonProps } from '@tarojs/components'
import type { KeyboardEvent } from 'react'

type AccessibleButtonProps = ButtonProps

/**
 * Taro renders Button as a custom element on H5. The custom element does not
 * receive native button keyboard semantics, so they are supplied explicitly
 * while the Mini Program continues to use the normal Taro Button behavior.
 */
export function AccessibleButton({ disabled, onClick, ...props }: AccessibleButtonProps) {
  const isDisabled = disabled === true
  const keyboardProps = {
    role: 'button',
    tabIndex: isDisabled ? -1 : 0,
    'aria-disabled': isDisabled ? 'true' : 'false',
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (isDisabled || event.repeat || (event.key !== 'Enter' && event.key !== ' ')) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      onClick?.(event as never)
    },
  } as unknown as ButtonProps
  const clickProps = onClick ? { onClick } : {}
  const disabledProps = isDisabled ? { disabled: true } : {}

  return <Button {...props} {...keyboardProps} {...clickProps} {...disabledProps} />
}
