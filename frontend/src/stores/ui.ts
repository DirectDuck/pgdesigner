import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useDark, useToggle } from '@vueuse/core'

export type DialogType = 'ddl' | 'lint' | 'diff' | 'testdata' | null
export type Theme = 'light' | 'dark'

export const useUiStore = defineStore('ui', () => {
  const activeDialog = ref<DialogType>(null)
  const tableEditorName = ref<string | null>(null)
  const tableEditorTab = ref<string | null>(null)
  const tableEditorFocusFK = ref<string | null>(null)
  const tableEditorFocusItem = ref<string | null>(null)
  const goToOpen = ref(false)
  const keyboardRefOpen = ref(false)
  const aboutOpen = ref(false)
  const settingsOpen = ref(false)
  const exporting = ref(false)
  const isWelcome = ref(false)
  const openDialogOpen = ref(false)

  // Theme
  const isDark = useDark({ storageKey: 'pgd-theme' })
  const toggleDark = useToggle(isDark)
  const theme = computed<Theme>({
    get: () => isDark.value ? 'dark' : 'light',
    set: (v) => { isDark.value = v === 'dark' },
  })
  function toggleTheme() { toggleDark() }

  function openDDL() { activeDialog.value = 'ddl' }
  function openLint() { activeDialog.value = 'lint' }
  function openDiff() { activeDialog.value = 'diff' }
  function openTestData() { activeDialog.value = 'testdata' }
  function closeDialog() { activeDialog.value = null }

  function openTableEditor(name: string, tab?: string, focusFK?: string, focusItem?: string) {
    tableEditorName.value = name
    tableEditorTab.value = tab || null
    tableEditorFocusFK.value = focusFK || null
    tableEditorFocusItem.value = focusItem || null
  }
  function closeTableEditor() {
    tableEditorName.value = null
    tableEditorTab.value = null
    tableEditorFocusFK.value = null
    tableEditorFocusItem.value = null
  }

  return {
    activeDialog, tableEditorName, tableEditorTab, tableEditorFocusFK, tableEditorFocusItem, theme, goToOpen, keyboardRefOpen, aboutOpen, settingsOpen, exporting, isWelcome, openDialogOpen,
    openDDL, openLint, openDiff, openTestData, closeDialog,
    openTableEditor, closeTableEditor,
    toggleTheme,
  }
})
