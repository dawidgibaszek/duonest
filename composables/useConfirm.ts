import { ref } from 'vue'

export type ConfirmType = 'danger' | 'warning' | 'info' | 'primary'
export type ConfirmIcon = 'trash' | 'warning' | 'info' | 'logout' | 'unlink' | 'heart'

export interface ConfirmOptions {
  title?: string
  message: string
  itemHighlight?: string
  confirmText?: string
  cancelText?: string
  type?: ConfirmType
  icon?: ConfirmIcon
  danger?: boolean
}

export interface ConfirmState extends ConfirmOptions {
  isOpen: boolean
}

const defaultState: ConfirmState = {
  isOpen: false,
  title: 'Potwierdzenie',
  message: '',
  itemHighlight: '',
  confirmText: 'Potwierdź',
  cancelText: 'Anuluj',
  type: 'danger',
  icon: 'trash',
  danger: true
}

const confirmState = ref<ConfirmState>({ ...defaultState })
let resolvePromise: ((value: boolean) => void) | null = null

export function useConfirm() {
  const confirm = (input: string | ConfirmOptions): Promise<boolean> => {
    if (resolvePromise) {
      resolvePromise(false)
      resolvePromise = null
    }

    if (typeof input === 'string') {
      const isDelete = /usuń|skasuj|delete|odłącz|rozłącz|wyczyść/i.test(input)
      confirmState.value = {
        isOpen: true,
        title: isDelete ? 'Potwierdzenie usunięcia' : 'Potwierdź operację',
        message: input,
        itemHighlight: '',
        confirmText: isDelete ? 'Usuń' : 'Potwierdź',
        cancelText: 'Anuluj',
        type: isDelete ? 'danger' : 'primary',
        icon: isDelete ? 'trash' : 'warning',
        danger: isDelete
      }
    } else {
      const isDanger = input.danger !== undefined ? input.danger : (input.type === 'danger' || (!input.type && /usuń|skasuj|delete|odłącz|rozłącz/i.test(input.message + ' ' + (input.title || ''))))
      const autoIcon: ConfirmIcon = input.icon || (isDanger ? 'trash' : (input.type === 'warning' ? 'warning' : 'info'))

      confirmState.value = {
        isOpen: true,
        title: input.title || (isDanger ? 'Potwierdzenie usunięcia' : 'Potwierdź operację'),
        message: input.message,
        itemHighlight: input.itemHighlight || '',
        confirmText: input.confirmText || (isDanger ? 'Usuń' : 'Potwierdź'),
        cancelText: input.cancelText || 'Anuluj',
        type: input.type || (isDanger ? 'danger' : 'primary'),
        icon: autoIcon,
        danger: isDanger
      }
    }

    return new Promise<boolean>((resolve) => {
      resolvePromise = resolve
    })
  }

  const handleConfirm = () => {
    confirmState.value.isOpen = false
    if (resolvePromise) {
      resolvePromise(true)
      resolvePromise = null
    }
  }

  const handleCancel = () => {
    confirmState.value.isOpen = false
    if (resolvePromise) {
      resolvePromise(false)
      resolvePromise = null
    }
  }

  return {
    confirmState,
    confirm,
    handleConfirm,
    handleCancel
  }
}
