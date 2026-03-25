import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'error' | 'info'
}

let nextId = 0
const toasts = ref<Toast[]>([])

export function showToast(message: string, type: 'error' | 'info' = 'error', duration = 5000) {
  const id = ++nextId
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, duration)
}

export function dismissToast(id: number) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

export function useToastState() {
  return { toasts, dismissToast }
}
