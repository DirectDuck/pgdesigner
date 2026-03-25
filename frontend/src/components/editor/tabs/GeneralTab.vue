<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'

const editor = useEditorStore()

const partitionTypes = ['range', 'list', 'hash']

function update(field: string, value: string | boolean) {
  if (!editor.draft) return;
  (editor.draft as Record<string, unknown>)[field] = value
}

function setPartitionType(value: string) {
  if (!editor.draft) return
  if (!value) {
    editor.draft.partitionBy = undefined
    editor.draft.partitions = []
    return
  }
  if (!editor.draft.partitionBy) {
    editor.draft.partitionBy = { type: value, columns: [] }
  } else {
    editor.draft.partitionBy = { ...editor.draft.partitionBy, type: value }
  }
}

function setPartitionColumns(value: string) {
  if (!editor.draft?.partitionBy) return
  editor.draft.partitionBy = {
    ...editor.draft.partitionBy,
    columns: value.split(',').map(s => s.trim()).filter(Boolean),
  }
}

function addPartition() {
  if (!editor.draft) return
  if (!editor.draft.partitions) editor.draft.partitions = []
  const n = editor.draft.partitions.length + 1
  editor.draft.partitions.push({ name: `${editor.draft.name}_p${n}`, bound: '' })
}

function removePartition(index: number) {
  if (!editor.draft?.partitions) return
  editor.draft.partitions.splice(index, 1)
}

function updatePartition(index: number, field: 'name' | 'bound', value: string) {
  if (!editor.draft?.partitions?.[index]) return
  editor.draft.partitions[index]![field] = value
}
</script>

<template>
  <div v-if="editor.draft" class="gt-wrap">
    <div class="gt-row">
      <label class="gt-label">Name</label>
      <input class="gt-input" :class="{ 'gt-error': editor.fieldHasError('name') }" :value="editor.draft.name" maxlength="63" @change="update('name', ($event.target as HTMLInputElement).value)" />
    </div>
    <div class="gt-row">
      <label class="gt-label">Schema</label>
      <input class="gt-input" :value="editor.draft.schema" disabled />
    </div>
    <div class="gt-row">
      <label class="gt-label">Comment</label>
      <textarea class="gt-textarea" :value="editor.draft.comment || ''" @change="update('comment', ($event.target as HTMLTextAreaElement).value)" rows="3" />
    </div>
    <div class="gt-row">
      <label class="gt-label"></label>
      <div class="gt-checks">
        <label class="gt-check">
          <input type="checkbox" :checked="editor.draft.unlogged" @change="update('unlogged', ($event.target as HTMLInputElement).checked)" />
          Unlogged
        </label>
      </div>
    </div>

    <!-- Partitioning -->
    <div class="gt-divider">Partitioning</div>
    <div class="gt-row">
      <label class="gt-label">Strategy</label>
      <select class="gt-input" :value="editor.draft.partitionBy?.type || ''" @change="setPartitionType(($event.target as HTMLSelectElement).value)">
        <option value="">None</option>
        <option v-for="pt in partitionTypes" :key="pt" :value="pt">{{ pt.toUpperCase() }}</option>
      </select>
    </div>
    <template v-if="editor.draft.partitionBy">
      <div class="gt-row">
        <label class="gt-label">Columns</label>
        <input class="gt-input" :value="editor.draft.partitionBy.columns.join(', ')" placeholder="col1, col2" @change="setPartitionColumns(($event.target as HTMLInputElement).value)" />
      </div>

      <div class="gt-row gt-partitions-header">
        <label class="gt-label">Partitions</label>
        <button class="gt-btn" @click="addPartition">+ Add</button>
      </div>
      <div v-for="(p, i) in (editor.draft.partitions || [])" :key="i" class="gt-partition-row">
        <input class="gt-part-name" :value="p.name" maxlength="63" placeholder="name" @change="updatePartition(i, 'name', ($event.target as HTMLInputElement).value)" />
        <input class="gt-part-bound" :value="p.bound" placeholder="FOR VALUES ..." @change="updatePartition(i, 'bound', ($event.target as HTMLInputElement).value)" />
        <button class="gt-btn-del" title="Remove" @click="removePartition(i)">&times;</button>
      </div>
      <div v-if="!(editor.draft.partitions || []).length" class="gt-empty">No partitions defined</div>
    </template>
  </div>
</template>

<style scoped>
.gt-wrap { padding: 0.923rem 1.231rem; max-width: 38.462rem; }
.gt-row { display: flex; align-items: flex-start; margin-bottom: 0.615rem; gap: 0.615rem; }
.gt-label { width: 6.154rem; font-size: 0.923rem; font-weight: 600; padding-top: 0.308rem; flex-shrink: 0; color: var(--color-text-primary); }
.gt-input, .gt-textarea {
  flex: 1; padding: 0.231rem 0.462rem; font-size: 0.923rem;
  border: 1px solid var(--color-border); background: var(--color-bg-surface);
  color: var(--color-text-primary); outline: none;
}
.gt-input:focus, .gt-textarea:focus { border-color: var(--color-accent); }
.gt-input:disabled { background: var(--color-bg-app); color: var(--color-text-muted); }
.gt-textarea { resize: vertical; font-family: inherit; }
.gt-checks { display: flex; gap: 0.923rem; padding-top: 0.154rem; }
.gt-check { font-size: 0.923rem; display: flex; align-items: center; gap: 0.308rem; color: var(--color-text-primary); cursor: pointer; }
.gt-error { border-color: #cc3333 !important; background: rgba(204, 51, 51, 0.05); }

/* Partitioning */
.gt-divider {
  margin: 1rem 0 0.615rem; padding-bottom: 0.308rem;
  font-size: 0.923rem; font-weight: 600; color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
}
select.gt-input { cursor: pointer; }
.gt-partitions-header { align-items: center; }
.gt-btn {
  padding: 0.154rem 0.615rem; font-size: 0.846rem; cursor: pointer;
  border: 1px solid var(--color-border); background: var(--color-bg-surface);
  color: var(--color-text-primary);
}
.gt-btn:hover { background: var(--color-bg-hover); }
.gt-partition-row {
  display: flex; gap: 0.462rem; margin-bottom: 0.308rem; margin-left: 6.769rem;
}
.gt-part-name {
  width: 10rem; padding: 0.154rem 0.462rem; font-size: 0.846rem;
  border: 1px solid var(--color-border); background: var(--color-bg-surface);
  color: var(--color-text-primary); outline: none;
}
.gt-part-bound {
  flex: 1; padding: 0.154rem 0.462rem; font-size: 0.846rem;
  border: 1px solid var(--color-border); background: var(--color-bg-surface);
  color: var(--color-text-primary); outline: none; font-family: monospace;
}
.gt-part-name:focus, .gt-part-bound:focus { border-color: var(--color-accent); }
.gt-btn-del {
  border: none; background: none; cursor: pointer; color: var(--color-text-muted);
  font-size: 1.077rem; line-height: 1; padding: 0 0.231rem;
}
.gt-btn-del:hover { color: #e55; }
.gt-empty { margin-left: 6.769rem; font-size: 0.846rem; color: var(--color-text-muted); font-style: italic; }
</style>
