import { ref, type Ref } from 'vue'

/** Keyboard navigation for split-list panels (↑↓, +/−, Delete, Enter/F2). */
export function useListKeyboard(opts: {
  count: () => number
  onAdd: () => void
  onDelete: () => void
  onEdit: (idx: number) => void
}) {
  const selectedIdx = ref<number | null>(null) as Ref<number | null>

  function onKeydown(e: KeyboardEvent) {
    if (opts.count() === 0) return
    const idx = selectedIdx.value ?? -1

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        selectedIdx.value = Math.max(0, idx - 1)
        break
      case 'ArrowDown':
        e.preventDefault()
        selectedIdx.value = Math.min(opts.count() - 1, idx + 1)
        break
      case '+':
        e.preventDefault()
        opts.onAdd()
        break
      case '-':
      case 'Delete':
        e.preventDefault()
        opts.onDelete()
        break
      case 'Enter':
      case 'F2':
        e.preventDefault()
        if (idx >= 0) opts.onEdit(idx)
        break
    }
  }

  return { selectedIdx, onKeydown }
}
