<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { useProjectStore } from '@/stores/project'
import { useCanvasStore } from '@/stores/canvas'
import { useUiStore } from '@/stores/ui'
import api from '@/api/factory'
import type { IProjectUpdateTableParams } from '@/api/factory'
import { appConfirm, appPrompt } from '@/composables/useAppDialog'
import { showToast } from '@/composables/useToast'
import { identifierError } from '@/composables/useIdentifierValidation'

const store = useProjectStore()
const canvasStore = useCanvasStore()
const ui = useUiStore()

const allTables = computed(() => store.schema?.tables || [])
const references = computed(() => [...(store.schema?.references || [])].sort((a, b) => a.name.localeCompare(b.name)))

// Group tables by schema, sorted within each group (include empty schemas from info)
const schemas = computed(() => {
  const map = new Map<string, typeof allTables.value>()
  // Seed with all known schemas (including empty ones)
  for (const s of store.info?.schemas || []) {
    map.set(s, [])
  }
  for (const t of allTables.value) {
    const s = t.schema || 'public'
    if (!map.has(s)) map.set(s, [])
    map.get(s)!.push(t)
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, tables]) => [name, [...tables].sort((a, b) => shortName(a.name).localeCompare(shortName(b.name)))] as const)
})
const hasMultipleSchemas = computed(() => schemas.value.length > 1)

function shortName(name: string) {
  const dot = name.indexOf('.')
  return dot >= 0 ? name.substring(dot + 1) : name
}

// --- Selected + Keyboard ---
const selectedTable = ref<string | null>(null)

function selectTable(name: string) {
  selectedTable.value = name
  canvasStore.focusNode(name)
}

function onTableKeydown(e: KeyboardEvent, tableName: string) {
  if (e.key === 'F2') {
    e.preventDefault()
    startRename(tableName)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    ui.openTableEditor(tableName)
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    deleteTable(tableName)
  }
}

// --- Create / Delete Table ---
async function createTable(schemaName: string) {
  const name = await appPrompt('New table name:', 'Create Table')
  if (!name) return
  try {
    await api.project.createTable({ schemaName, tableName: name })
    await store.loadAll()
  } catch (e: unknown) {
    showToast('Create failed: ' + (e instanceof Error ? e.message : e))
  }
}

async function deleteTable(name: string) {
  if (!await appConfirm(`Delete table "${name}"?`, 'Delete Table')) return
  try {
    await api.project.deleteTable({ name })
    if (selectedTable.value === name) selectedTable.value = null
    await store.loadAll()
  } catch (e: unknown) {
    showToast('Delete failed: ' + (e instanceof Error ? e.message : e))
  }
}

// --- Create / Delete Schema ---
async function createSchema() {
  const name = await appPrompt('New schema name:', 'Create Schema')
  if (!name) return
  try {
    await api.project.createSchema({ name: name })
    await store.loadAll()
  } catch (e: unknown) {
    showToast('Create schema failed: ' + (e instanceof Error ? e.message : e))
  }
}

async function deleteSchema(name: string) {
  if (!await appConfirm(`Delete schema "${name}"? (must be empty)`, 'Delete Schema')) return
  try {
    await api.project.deleteSchema({ name })
    await store.loadAll()
  } catch (e: unknown) {
    showToast('Delete schema failed: ' + (e instanceof Error ? e.message : e))
  }
}

// --- Move Table (context menu) ---
const contextMenu = ref<{ x: number; y: number; table: string; schema: string } | null>(null)
const contextMenuRef = ref<HTMLElement>()

function showContextMenu(e: MouseEvent, tableName: string, currentSchema: string) {
  const others = (store.info?.schemas || []).filter(s => s !== currentSchema)
  if (others.length === 0) return
  contextMenu.value = { x: e.clientX, y: e.clientY, table: tableName, schema: currentSchema }
}

function closeContextMenu() {
  contextMenu.value = null
}

onClickOutside(contextMenuRef, closeContextMenu)

const moveTargets = computed(() => {
  if (!contextMenu.value) return []
  return (store.info?.schemas || []).filter(s => s !== contextMenu.value!.schema)
})

async function moveTableTo(toSchema: string) {
  const name = contextMenu.value?.table
  closeContextMenu()
  if (!name) return
  try {
    await api.project.moveTable({ name, toSchema })
    await store.loadAll()
  } catch (e: unknown) {
    showToast('Move failed: ' + (e instanceof Error ? e.message : e))
  }
}

// --- Inline Rename ---
const renaming = ref<string | null>(null)
const renameValue = ref('')

function tableShortName(name: string): string {
  const dot = name.indexOf('.')
  return dot >= 0 ? name.slice(dot + 1) : name
}

function startRename(name: string) {
  renaming.value = name
  renameValue.value = tableShortName(name)
  nextTick(() => {
    const input = document.querySelector('.tree-rename-input') as HTMLInputElement
    if (input) { input.focus(); input.select() }
  })
}

let renamingJustFinished = false

const renameError = ref<string | null>(null)

async function commitRename() {
  const oldName = renaming.value
  const newName = renameValue.value.trim()
  if (!oldName || !newName || newName === tableShortName(oldName)) { renaming.value = null; renameError.value = null; return }
  const err = identifierError(newName)
  if (err) { renameError.value = err; return }
  renaming.value = null
  renameError.value = null
  // Prevent dblclick from opening editor right after rename blur
  renamingJustFinished = true
  setTimeout(() => { renamingJustFinished = false }, 300)
  try {
    await api.project.updateTable({ name: oldName, general: { name: newName } } as unknown as IProjectUpdateTableParams)
    store.loadAll()
  } catch (e: unknown) {
    console.error('Rename failed:', e instanceof Error ? e.message : e)
  }
}

function cancelRename() {
  renaming.value = null
  renameError.value = null
}

function onRenameKeydown(e: KeyboardEvent) {
  e.stopPropagation() // prevent parent onTableKeydown from catching Enter/Escape
  if (e.key === 'Enter') { e.preventDefault(); commitRename() }
  else if (e.key === 'Escape') { cancelRename() }
}

</script>

<template>
  <div class="tree-panel">
    <!-- Header -->
    <div class="tree-section-header">
      Object Tree View
    </div>

    <!-- Tree content -->
    <div class="tree-content">
      <!-- Database -->
      <div class="tree-row font-semibold">
        <svg class="tree-icon" viewBox="0 0 14 14"><rect x="1" y="3" width="12" height="9" rx="1" fill="#8899bb" stroke="#556688" stroke-width="0.8"/><rect x="3" y="1" width="8" height="4" rx="0.5" fill="#aabbdd" stroke="#556688" stroke-width="0.5"/></svg>
        {{ store.info?.name || 'Database' }}
      </div>

      <div class="pl-3">
        <!-- Tables grouped by schema -->
        <div class="tree-row font-semibold tree-group-label tree-schema-header">
          <svg class="tree-icon" viewBox="0 0 14 14"><rect x="1" y="1" width="12" height="11" fill="#e8d870" stroke="#886600" stroke-width="0.8"/><line x1="1" y1="5" x2="13" y2="5" stroke="#886600" stroke-width="0.6"/><line x1="5" y1="5" x2="5" y2="12" stroke="#886600" stroke-width="0.4"/></svg>
          Tables ({{ allTables.length }})
          <button v-if="!hasMultipleSchemas && schemas.length" class="tree-action-btn" title="Add table" @click.stop="createTable(schemas[0]![0])">+</button>
          <button class="tree-action-btn" title="Add schema" @click.stop="createSchema()">S+</button>
        </div>

        <template v-for="[schemaName, schemaTables] in schemas" :key="schemaName">
          <!-- Schema header (only if multiple schemas) -->
          <div v-if="hasMultipleSchemas" class="tree-row font-semibold tree-group-label pl-3 mt-0.5 tree-schema-header">
            <svg class="tree-icon" viewBox="0 0 14 14"><rect x="1" y="2" width="12" height="10" rx="0.5" fill="#7799bb" stroke="#556688" stroke-width="0.8"/><line x1="4" y1="5" x2="10" y2="5" stroke="#fff" stroke-width="0.6"/><line x1="4" y1="8" x2="10" y2="8" stroke="#fff" stroke-width="0.6"/></svg>
            {{ schemaName }} ({{ schemaTables.length }})
            <button class="tree-action-btn" title="Add table" @click.stop="createTable(schemaName)">+</button>
            <button v-if="schemaTables.length === 0" class="tree-delete-btn" title="Delete schema" @click.stop="deleteSchema(schemaName)">&times;</button>
          </div>

          <div :class="hasMultipleSchemas ? 'pl-6' : 'pl-3'">
            <div
              v-for="table in schemaTables"
              :key="table.name"
              class="tree-row tree-item"
              :class="{ 'tree-selected': selectedTable === table.name }"
              tabindex="0"
              @click="selectTable(table.name)"
              @dblclick.prevent="!renamingJustFinished && ui.openTableEditor(table.name)"
              @contextmenu.prevent="showContextMenu($event, table.name, schemaName)"
              @keydown="onTableKeydown($event, table.name)"
            >
              <svg class="tree-icon" viewBox="0 0 14 14"><rect x="1" y="1" width="12" height="11" fill="#e8d870" stroke="#886600" stroke-width="0.8"/><line x1="1" y1="5" x2="13" y2="5" stroke="#886600" stroke-width="0.6"/><line x1="5" y1="5" x2="5" y2="12" stroke="#886600" stroke-width="0.4"/></svg>
              <span v-if="renaming === table.name" class="tree-rename-wrap">
                <input
                  v-model="renameValue"
                  class="tree-rename-input"
                  :class="{ 'tree-rename-error': renameError }"
                  maxlength="63"
                  :title="renameError || ''"
                  @blur="commitRename"
                  @keydown="onRenameKeydown"
                />
              </span>
              <template v-else>
                <span class="truncate">{{ table.name }}</span>
                <span v-if="table.partitioned" class="tree-badge">⊞</span>
                <span class="tree-count">{{ table.columns.length }}c<template v-if="table.partitionCount"> · {{ table.partitionCount }}p</template></span>
                <button class="tree-delete-btn" title="Delete table" @click.stop="deleteTable(table.name)">&times;</button>
              </template>
            </div>
          </div>
        </template>

        <!-- References -->
        <div class="tree-row font-semibold tree-group-label mt-1">
          <svg class="tree-icon" viewBox="0 0 14 14"><path d="M3 11 L11 3" stroke="#666" stroke-width="1.5" fill="none"/><path d="M8 3 L11 3 L11 6" stroke="#666" stroke-width="1.2" fill="none"/></svg>
          References ({{ references.length }})
        </div>
        <div class="pl-3">
          <div
            v-for="ref in references"
            :key="ref.name"
            class="tree-row tree-item tree-ref"
            @click="canvasStore.focusNode(ref.from)"
          >
            <svg class="tree-icon" viewBox="0 0 14 14"><path d="M3 11 L11 3" stroke="#999" stroke-width="1" fill="none"/><path d="M8 3 L11 3 L11 6" stroke="#999" stroke-width="0.8" fill="none"/></svg>
            <span class="truncate">{{ ref.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Context menu for Move to Schema -->
    <Teleport to="body">
      <div v-if="contextMenu && moveTargets.length" ref="contextMenuRef" class="tree-context-menu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }" @mouseleave="closeContextMenu">
        <div class="tree-context-label">Move to schema:</div>
        <div v-for="s in moveTargets" :key="s" class="tree-context-item" @click="moveTableTo(s)">{{ s }}</div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.tree-panel {
  height: 100%; display: flex; flex-direction: column;
  background: var(--color-bg-surface); border-right: 1px solid var(--color-border);
}
.tree-section-header {
  height: 1.538rem; background: var(--color-bg-app); border-bottom: 1px solid var(--color-border);
  display: flex; align-items: center; padding: 0 0.615rem;
  font-size: 0.846rem; font-weight: 600; flex-shrink: 0;
  color: var(--color-text-primary);
}
.tree-content {
  flex: 1; overflow: auto; padding: 0.308rem; font-size: 0.923rem; user-select: none;
  color: var(--color-text-primary);
}
.tree-row {
  display: flex; align-items: center; gap: 0.308rem;
  padding: 1px 0.308rem; line-height: 1.385rem; white-space: nowrap; min-width: 0;
}
.tree-icon { width: 1.077rem; height: 1.077rem; flex-shrink: 0; }
.tree-group-label { color: var(--color-text-secondary); }
.tree-item { cursor: pointer; outline: none; }
.tree-item:hover { background: var(--color-bg-hover); }
.tree-item:focus { background: var(--color-bg-hover); }
.tree-selected { background: var(--color-bg-selected) !important; }
.tree-count { color: var(--color-text-muted); margin-left: auto; flex-shrink: 0; }
.tree-ref { color: var(--color-text-secondary); }
.tree-rename-wrap { flex: 1; min-width: 0; }
.tree-rename-input {
  width: 100%; padding: 0 0.231rem; font-size: 0.923rem;
  border: 1px solid var(--color-accent); background: var(--color-bg-surface);
  color: var(--color-text-primary); outline: none; line-height: 1.231rem;
}
.tree-rename-error { border-color: #cc3333 !important; }
.tree-schema-header { position: relative; }
.tree-action-btn {
  display: none; margin-left: auto; border: none; background: none; cursor: pointer;
  color: var(--color-text-muted); font-size: 1rem; line-height: 1; padding: 0 0.231rem;
  flex-shrink: 0;
}
.tree-action-btn:hover { color: var(--color-accent); }
.tree-schema-header:hover .tree-action-btn { display: inline; }
.tree-delete-btn {
  display: none; border: none; background: none; cursor: pointer;
  color: var(--color-text-muted); font-size: 0.923rem; line-height: 1; padding: 0 0.154rem;
  flex-shrink: 0;
}
.tree-delete-btn:hover { color: #e55; }
.tree-item:hover .tree-delete-btn { display: inline; }
.tree-badge { font-size: 0.846rem; color: var(--color-text-muted); flex-shrink: 0; }
</style>

<style>
.tree-context-menu {
  position: fixed; z-index: 9999;
  background: var(--color-bg-surface); border: 1px solid var(--color-border);
  border-radius: 0.308rem; padding: 0.231rem 0; min-width: 8rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.18); font-size: 0.923rem;
}
.tree-context-label {
  padding: 0.231rem 0.615rem; color: var(--color-text-muted); font-size: 0.846rem;
}
.tree-context-item {
  padding: 0.231rem 0.615rem; cursor: pointer; color: var(--color-text-primary);
}
.tree-context-item:hover { background: var(--color-bg-hover); }
</style>
