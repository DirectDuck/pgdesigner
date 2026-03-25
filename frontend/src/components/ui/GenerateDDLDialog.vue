<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { DialogRoot, DialogOverlay, DialogContent, DialogTitle, DialogClose } from 'reka-ui'
import { useProjectStore } from '@/stores/project'
import { useUiStore } from '@/stores/ui'
import SqlViewer from './SqlViewer.vue'

const store = useProjectStore()
const ui = useUiStore()
const copied = ref(false)

const isOpen = computed(() => ui.activeDialog === 'ddl')

watch(isOpen, (open) => {
  if (open && !store.ddl) {
    store.loadDDL()
  }
  copied.value = false
})

function close() {
  ui.closeDialog()
}

async function copyDDL() {
  await navigator.clipboard.writeText(store.ddl)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function downloadSQL() {
  if (!store.ddl) return
  const name = (store.info?.name || 'schema') + '.sql'
  const blob = new Blob([store.ddl], { type: 'text/sql' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <DialogRoot :open="isOpen">
    <DialogOverlay class="dlg-overlay" @click="close" />
    <DialogContent class="dlg-box" @escape-key-down="close">
      <div class="dlg-header">
        <DialogTitle class="text-xs font-semibold">Generate Database — DDL Preview</DialogTitle>
        <DialogClose class="dlg-close" @click="close">&times;</DialogClose>
      </div>
      <div class="dlg-body">
        <SqlViewer v-if="store.ddl" :value="store.ddl" />
        <div v-else class="p-4 text-xs" style="color: var(--color-text-muted)">Loading DDL...</div>
      </div>
      <div class="dlg-footer">
        <span v-if="store.ddl" class="text-xs" style="color: var(--color-text-muted)">{{ store.ddl.split('\n').length }} lines</span>
        <span v-else />
        <div class="flex gap-1">
          <button class="dlg-btn" :disabled="!store.ddl" @click="downloadSQL">Download .sql</button>
          <button class="dlg-btn" :disabled="!store.ddl" @click="copyDDL">
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
          <button class="dlg-btn" @click="close">Close</button>
        </div>
      </div>
    </DialogContent>
  </DialogRoot>
</template>

<style scoped>
.dlg-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.3); z-index: 40; }
.dlg-box {
  position: fixed; top: 5%; left: 10%; right: 10%; bottom: 5%; z-index: 50;
  background: var(--color-bg-surface); border: 1px solid var(--color-menu-border);
  display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,.2);
}
.dlg-header {
  height: 2.154rem; background: var(--color-bg-app); border-bottom: 1px solid var(--color-border);
  display: flex; align-items: center; justify-content: space-between; padding: 0 0.615rem; flex-shrink: 0;
  color: var(--color-text-primary);
}
.dlg-close {
  width: 1.538rem; height: 1.538rem; display: flex; align-items: center; justify-content: center;
  color: var(--color-text-secondary); font-size: 1.077rem;
}
.dlg-close:hover { background: var(--color-bg-hover); }
.dlg-body { flex: 1; min-height: 0; overflow: auto; }
.dlg-footer {
  height: 2.154rem; background: var(--color-bg-app); border-top: 1px solid var(--color-border);
  display: flex; align-items: center; justify-content: space-between; padding: 0 0.615rem; flex-shrink: 0;
}
.dlg-btn {
  padding: 0 0.923rem; height: 1.538rem; font-size: 0.923rem;
  border: 1px solid var(--color-menu-border); background: var(--color-bg-surface);
  color: var(--color-text-primary);
}
.dlg-btn:hover { background: var(--color-bg-hover); }
</style>
