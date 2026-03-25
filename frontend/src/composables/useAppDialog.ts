import { ref, shallowRef } from 'vue'

export type DialogMode = 'confirm' | 'prompt' | 'alert' | 'confirmSave'
export type DialogResult = boolean | string | null | void | 'save' | 'discard' | 'cancel'

export interface DialogState {
  mode: DialogMode
  title: string
  message: string
  defaultValue: string
  placeholder: string
  skipValidation: boolean
  resolve: (value: DialogResult) => void
}

const visible = ref(false)
const state = shallowRef<DialogState | null>(null)
const inputValue = ref('')

function open(mode: DialogMode, message: string, title?: string, defaultValue?: string, skipValidation = false, placeholder = ''): Promise<DialogResult> {
  return new Promise((resolve) => {
    inputValue.value = defaultValue ?? ''
    state.value = { mode, title: title ?? '', message, defaultValue: defaultValue ?? '', placeholder, skipValidation, resolve }
    visible.value = true
  })
}

/** Show confirm dialog. Returns true if OK, false if Cancel. */
export function appConfirm(message: string, title = 'Confirm'): Promise<boolean> {
  return open('confirm', message, title) as Promise<boolean>
}

/** Show prompt dialog. Returns string if OK, null if Cancel. */
export function appPrompt(message: string, title = 'Input', defaultValue = '', skipValidation = false, placeholder = ''): Promise<string | null> {
  return open('prompt', message, title, defaultValue, skipValidation, placeholder) as Promise<string | null>
}

/** Show alert dialog. Resolves when OK is clicked. */
export function appAlert(message: string, title = 'Error'): Promise<void> {
  return open('alert', message, title) as Promise<void>
}

/** Show 3-button save confirm. Returns 'save' | 'discard' | 'cancel'. */
export function appConfirmSave(message: string, title = 'Unsaved Changes'): Promise<'save' | 'discard' | 'cancel'> {
  return open('confirmSave', message, title) as Promise<'save' | 'discard' | 'cancel'>
}

export function useAppDialogState() {
  function close(result: DialogResult) {
    if (state.value) {
      state.value.resolve(result)
    }
    visible.value = false
    state.value = null
  }

  return { visible, state, inputValue, close }
}
