import { useEffect } from 'react'

interface AccessibleDialogOptions {
  readonly open: boolean
  readonly dialogId: string
  readonly initialFocusId: string
  readonly onEscape?: () => void
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'taro-button-core:not([disabled])',
  'taro-input-core:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useAccessibleDialog({
  open,
  dialogId,
  initialFocusId,
  onEscape,
}: AccessibleDialogOptions): void {
  useEffect(() => {
    if (!open || process.env.TARO_ENV !== 'h5' || typeof document === 'undefined') {
      return undefined
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusTimer = window.setTimeout(() => {
      document.getElementById(initialFocusId)?.focus()
    }, 0)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault()
        onEscape()
        return
      }
      if (event.key !== 'Tab') return

      const dialog = document.getElementById(dialogId)
      if (dialog === null) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => element.getAttribute('aria-disabled') !== 'true',
      )
      if (focusable.length === 0) return
      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus()
    }
  }, [dialogId, initialFocusId, onEscape, open])
}
