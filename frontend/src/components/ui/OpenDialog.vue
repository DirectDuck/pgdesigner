<script setup lang="ts">
import { ref, nextTick, useTemplateRef } from 'vue'
import { whenever } from '@vueuse/core'
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from 'reka-ui'
import { useProjectStore } from '@/stores/project'
import { useUiStore } from '@/stores/ui'
import api from '@/api/factory'
import { showToast } from '@/composables/useToast'

const store = useProjectStore()
const ui = useUiStore()

const mode = ref<'file' | 'dsn'>('file')
const filePath = ref('')
const dsn = ref('')
const loading = ref(false)
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef')
const dsnInputRef = useTemplateRef<HTMLInputElement>('dsnInputRef')

whenever(() => ui.openDialogOpen, () => {
  filePath.value = ''
  dsn.value = ''
  mode.value = 'file'
  loading.value = false
  nextTick(() => fileInputRef.value?.focus())
})

function selectMode(m: 'file' | 'dsn') {
  mode.value = m
  nextTick(() => {
    if (m === 'file') fileInputRef.value?.focus()
    else dsnInputRef.value?.focus()
  })
}

async function onOpen() {
  const path = mode.value === 'file' ? filePath.value.trim() : dsn.value.trim()
  if (!path) return
  loading.value = true
  try {
    await api.app.openFile({ path })
    await store.loadAll()
    ui.openDialogOpen = false
  } catch (e: unknown) {
    showToast('Open failed: ' + (e instanceof Error ? e.message : e))
  } finally {
    loading.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); onOpen() }
}
</script>

<template>
  <DialogRoot :open="ui.openDialogOpen">
    <DialogPortal>
      <DialogOverlay class="od-overlay" @click="ui.openDialogOpen = false" />
      <DialogContent class="od-box" @escape-key-down="ui.openDialogOpen = false" @keydown="onKeydown">
        <DialogTitle class="od-title">Open</DialogTitle>

        <div class="od-body">
          <!-- File mode -->
          <div class="od-section" :class="{ 'od-active': mode === 'file' }" @click="selectMode('file')">
            <div class="od-section-header">
              <span class="od-radio" :class="{ 'od-radio-on': mode === 'file' }" />
              <span class="od-section-label">File path</span>
            </div>
            <input
              ref="fileInputRef"
              v-model="filePath"
              class="od-input"
              placeholder="/path/to/schema.pgd"
              :disabled="mode !== 'file'"
              @focus="mode = 'file'"
            />
            <div class="od-formats">.pgd .pdd .dbs .dm2 .sql</div>
          </div>

          <div class="od-divider"><span>or</span></div>

          <!-- DSN mode -->
          <div class="od-section" :class="{ 'od-active': mode === 'dsn' }" @click="selectMode('dsn')">
            <div class="od-section-header">
              <span class="od-radio" :class="{ 'od-radio-on': mode === 'dsn' }" />
              <span class="od-section-label">PostgreSQL connection</span>
            </div>
            <input
              ref="dsnInputRef"
              v-model="dsn"
              class="od-input"
              placeholder="postgres://user:pass@localhost:5432/dbname?sslmode=disable"
              :disabled="mode !== 'dsn'"
              @focus="mode = 'dsn'"
            />
            <div class="od-hint">Imports schema via reverse engineering</div>
          </div>
        </div>

        <div class="od-footer">
          <button class="od-btn" @click="ui.openDialogOpen = false">Cancel</button>
          <button
            class="od-btn od-btn-primary"
            :disabled="loading || (mode === 'file' ? !filePath.trim() : !dsn.trim())"
            @click="onOpen"
          >{{ loading ? 'Opening...' : 'Open' }}</button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style>
.od-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.3); z-index: 60; }
.od-box {
  position: fixed; z-index: 70;
  top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 28rem;
  background: var(--color-bg-surface); border: 1px solid var(--color-menu-border);
  box-shadow: 0 4px 16px rgba(0,0,0,.25);
  display: flex; flex-direction: column;
}
.od-title {
  padding: 0.615rem 0.923rem;
  font-size: 0.923rem; font-weight: 600; color: var(--color-text-primary);
  background: var(--color-bg-app); border-bottom: 1px solid var(--color-border);
}
.od-body { padding: 0.923rem; display: flex; flex-direction: column; gap: 0.615rem; }

.od-section {
  padding: 0.615rem; border: 1px solid var(--color-border-subtle);
  border-radius: 0.231rem; cursor: pointer; opacity: 0.6;
  transition: opacity 0.15s;
}
.od-section.od-active { opacity: 1; border-color: var(--color-accent); }

.od-section-header { display: flex; align-items: center; gap: 0.462rem; margin-bottom: 0.385rem; }
.od-section-label { font-size: 0.846rem; font-weight: 600; color: var(--color-text-primary); }

.od-radio {
  width: 0.846rem; height: 0.846rem; border-radius: 50%;
  border: 2px solid var(--color-text-muted); flex-shrink: 0;
}
.od-radio-on { border-color: var(--color-accent); background: var(--color-accent); }

.od-input {
  width: 100%; padding: 0.308rem 0.462rem; font-size: 0.846rem;
  border: 1px solid var(--color-border); background: var(--color-bg-surface);
  color: var(--color-text-primary); outline: none; box-sizing: border-box;
}
.od-input:focus { border-color: var(--color-accent); }
.od-input:disabled { opacity: 0.5; }

.od-formats {
  margin-top: 0.231rem; font-size: 0.692rem; color: var(--color-text-muted);
  display: flex; gap: 0.308rem;
}
.od-hint { margin-top: 0.231rem; font-size: 0.692rem; color: var(--color-text-secondary); font-style: italic; }

.od-divider {
  display: flex; align-items: center; gap: 0.615rem;
  font-size: 0.692rem; color: var(--color-text-muted);
}
.od-divider::before, .od-divider::after {
  content: ''; flex: 1; height: 1px; background: var(--color-border-subtle);
}

.od-footer {
  padding: 0.462rem 0.923rem;
  background: var(--color-bg-app); border-top: 1px solid var(--color-border);
  display: flex; justify-content: flex-end; gap: 0.308rem;
}
.od-btn {
  padding: 0.231rem 0.923rem; font-size: 0.923rem;
  border: 1px solid var(--color-menu-border); background: var(--color-bg-surface);
  color: var(--color-text-primary); cursor: default;
}
.od-btn:hover:not(:disabled) { background: var(--color-bg-hover); }
.od-btn:disabled { opacity: 0.5; }
.od-btn-primary { font-weight: 600; }
</style>
