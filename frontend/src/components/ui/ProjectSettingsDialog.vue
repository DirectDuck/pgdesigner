<script setup lang="ts">
import { ref, watch } from 'vue'
import { DialogRoot, DialogOverlay, DialogContent, DialogTitle, DialogClose } from 'reka-ui'
import type { IProjectSettings } from '@/api/factory'
import api from '@/api/factory'
import { useProjectStore } from '@/stores/project'
import { showToast } from '@/composables/useToast'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const store = useProjectStore()

const form = ref<IProjectSettings | null>(null)
const saving = ref(false)

watch(() => props.open, async (v) => {
  if (v) {
    form.value = { ...await api.project.getProjectSettings() }
  }
})

async function save() {
  if (!form.value) return
  saving.value = true
  try {
    await api.project.updateProjectSettings({ settings: form.value })
    await store.loadAll()
    emit('close')
  } catch (e: unknown) {
    showToast('Save failed: ' + (e instanceof Error ? e.message : e))
  } finally {
    saving.value = false
  }
}

const pgVersions = ['10', '11', '12', '13', '14', '15', '16', '17', '18']
const namingConventions = [
  { value: 'snake_case', label: 'snake_case' },
  { value: 'camelCase', label: 'camelCase' },
  { value: 'PascalCase', label: 'PascalCase' },
]
const tableNaming = [
  { value: '', label: 'Any' },
  { value: 'plural', label: 'Plural' },
  { value: 'singular', label: 'Singular' },
]
const fkActions = ['no action', 'cascade', 'set null', 'set default', 'restrict']

const hints: Record<string, string> = {
  name: 'Project name shown in the title bar, Object Tree, and exported files',
  description: 'Optional description for documentation and About dialog',
  pgVersion: 'Target PostgreSQL version. Controls version-aware lint warnings (e.g. GENERATED requires PG12+, COMPRESSION requires PG14+) and available DDL syntax',
  defaultSchema: 'Schema used when table names have no explicit prefix. Tables in this schema appear without "schema." qualifier in the ERD and DDL',
  namingConvention: 'Lint rule W003: warns when identifiers don\'t match the chosen style. Affects tables, columns, indexes, constraints',
  namingTables: 'Lint rule W004: warns when table names don\'t follow plural/singular convention. "Any" disables this check',
  defaultNullable: 'Default NULL/NOT NULL for new columns. "false" means new columns are NOT NULL by default',
  defaultOnDelete: 'Default FK ON DELETE action for new foreign keys. NO ACTION = error if referenced row deleted, CASCADE = delete referencing rows',
  defaultOnUpdate: 'Default FK ON UPDATE action for new foreign keys. NO ACTION = error if referenced key updated, CASCADE = update referencing columns',
  lintIgnoreRules: 'Comma-separated lint rule codes to suppress project-wide (e.g. W015,I009). Use Check Diagram to see all available codes',
}
</script>

<template>
  <DialogRoot :open="open">
    <DialogOverlay class="psd-overlay" @click="emit('close')" />
    <DialogContent class="psd-box" @escape-key-down="emit('close')">
      <DialogClose class="psd-close" @click="emit('close')">&times;</DialogClose>
      <DialogTitle class="psd-title">Project Settings</DialogTitle>

      <div v-if="form" class="psd-form">
        <!-- General -->
        <div class="psd-section">General</div>
        <label class="psd-field">
          <span class="psd-label">Name</span>
          <input v-model="form.name" class="psd-input" />
          <span class="psd-hint" :title="hints.name">?</span>
        </label>
        <label class="psd-field">
          <span class="psd-label">Description</span>
          <input v-model="form.description" class="psd-input" />
          <span class="psd-hint" :title="hints.description">?</span>
        </label>
        <label class="psd-field">
          <span class="psd-label">PG Version</span>
          <select v-model="form.pgVersion" class="psd-select">
            <option v-for="v in pgVersions" :key="v" :value="v">PostgreSQL {{ v }}</option>
          </select>
          <span class="psd-hint" :title="hints.pgVersion">?</span>
        </label>
        <label class="psd-field">
          <span class="psd-label">Default Schema</span>
          <select v-model="form.defaultSchema" class="psd-select">
            <option v-for="s in store.info?.schemas || ['public']" :key="s" :value="s">{{ s }}</option>
          </select>
          <span class="psd-hint" :title="hints.defaultSchema">?</span>
        </label>

        <!-- Naming -->
        <div class="psd-section">Naming</div>
        <label class="psd-field">
          <span class="psd-label">Convention</span>
          <select v-model="form.namingConvention" class="psd-select">
            <option v-for="c in namingConventions" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
          <span class="psd-hint" :title="hints.namingConvention">?</span>
        </label>
        <label class="psd-field">
          <span class="psd-label">Tables</span>
          <select v-model="form.namingTables" class="psd-select">
            <option v-for="t in tableNaming" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
          <span class="psd-hint" :title="hints.namingTables">?</span>
        </label>

        <!-- Defaults -->
        <div class="psd-section">Defaults</div>
        <label class="psd-field">
          <span class="psd-label">Nullable</span>
          <select v-model="form.defaultNullable" class="psd-select">
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
          <span class="psd-hint" :title="hints.defaultNullable">?</span>
        </label>
        <label class="psd-field">
          <span class="psd-label">ON DELETE</span>
          <select v-model="form.defaultOnDelete" class="psd-select">
            <option v-for="a in fkActions" :key="a" :value="a">{{ a }}</option>
          </select>
          <span class="psd-hint" :title="hints.defaultOnDelete">?</span>
        </label>
        <label class="psd-field">
          <span class="psd-label">ON UPDATE</span>
          <select v-model="form.defaultOnUpdate" class="psd-select">
            <option v-for="a in fkActions" :key="a" :value="a">{{ a }}</option>
          </select>
          <span class="psd-hint" :title="hints.defaultOnUpdate">?</span>
        </label>

        <!-- Lint -->
        <div class="psd-section">Lint</div>
        <label class="psd-field">
          <span class="psd-label">Ignore Rules</span>
          <input v-model="form.lintIgnoreRules" class="psd-input" placeholder="W015,I009" />
          <span class="psd-hint" :title="hints.lintIgnoreRules">?</span>
        </label>

        <!-- Actions -->
        <div class="psd-actions">
          <button class="psd-btn psd-btn-secondary" @click="emit('close')">Cancel</button>
          <button class="psd-btn psd-btn-primary" :disabled="saving" @click="save">Save</button>
        </div>
      </div>
      <div v-else class="psd-loading">Loading...</div>
    </DialogContent>
  </DialogRoot>
</template>

<style scoped>
.psd-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.3); z-index: 40; }
.psd-box {
  position: fixed; z-index: 50;
  top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 28rem; max-height: 85vh; overflow-y: auto;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-menu-border);
  box-shadow: 0 4px 16px rgba(0,0,0,.25);
  padding: 1.538rem;
}
.psd-close {
  position: absolute; top: 0.462rem; right: 0.462rem;
  width: 1.538rem; height: 1.538rem; display: flex; align-items: center; justify-content: center;
  color: var(--color-text-secondary); font-size: 1.077rem; cursor: pointer;
  border: none; background: none;
}
.psd-close:hover { background: var(--color-bg-hover); }
.psd-title { font-size: 1.154rem; font-weight: 700; color: var(--color-text-primary); margin: 0 0 1rem; }
.psd-form { display: flex; flex-direction: column; gap: 0.462rem; }
.psd-section {
  font-size: 0.846rem; font-weight: 600; color: var(--color-text-secondary);
  margin-top: 0.615rem; padding-bottom: 0.231rem; border-bottom: 1px solid var(--color-border-subtle);
}
.psd-field { display: flex; align-items: center; gap: 0.615rem; }
.psd-label {
  width: 7rem; flex-shrink: 0; font-size: 0.846rem; color: var(--color-text-secondary); text-align: right;
}
.psd-hint {
  display: inline-flex; align-items: center; justify-content: center;
  width: 1.077rem; height: 1.077rem; border-radius: 50%;
  font-size: 0.692rem; font-weight: 700; line-height: 1;
  color: var(--color-text-muted); border: 1px solid var(--color-border);
  cursor: help; flex-shrink: 0;
}
.psd-hint:hover { color: var(--color-accent); border-color: var(--color-accent); }
.psd-input, .psd-select {
  flex: 1; padding: 0.231rem 0.385rem; font-size: 0.923rem;
  border: 1px solid var(--color-border); background: var(--color-bg-surface);
  color: var(--color-text-primary); outline: none;
}
.psd-input:focus, .psd-select:focus { border-color: var(--color-accent); }
.psd-actions { display: flex; justify-content: flex-end; gap: 0.615rem; margin-top: 1rem; }
.psd-btn {
  padding: 0.385rem 1rem; font-size: 0.923rem; border: 1px solid var(--color-border);
  cursor: pointer; background: var(--color-bg-surface); color: var(--color-text-primary);
}
.psd-btn:hover { background: var(--color-bg-hover); }
.psd-btn-primary { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
.psd-btn-primary:hover { opacity: 0.9; }
.psd-btn:disabled { opacity: 0.5; cursor: default; }
.psd-loading { text-align: center; padding: 1.538rem; color: var(--color-text-muted); font-size: 0.923rem; }
</style>
