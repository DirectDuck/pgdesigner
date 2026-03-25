<script setup lang="ts">
/**
 * Reusable component: a dynamic list of column selects.
 * Used by IndexProperties (columns, include) and FKProperties (column pairs).
 */
const props = defineProps<{
  modelValue: string[]
  columns: string[]  // available column names from the table
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

function add() {
  emit('update:modelValue', [...props.modelValue, ''])
}

function remove(index: number) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}

function update(index: number, value: string) {
  const copy = [...props.modelValue]
  copy[index] = value
  emit('update:modelValue', copy)
}
</script>

<template>
  <div class="dcl">
    <label class="dcl-label">{{ label }}</label>
    <div v-for="(val, i) in modelValue" :key="i" class="dcl-row">
      <select class="dcl-select" :value="val" @change="update(i, ($event.target as HTMLSelectElement).value)">
        <option value="">(select)</option>
        <option v-for="c in columns" :key="c" :value="c">{{ c }}</option>
      </select>
      <button class="dcl-btn-del" @click="remove(i)">×</button>
    </div>
    <button class="dcl-btn-add" @click="add">+ Add</button>
  </div>
</template>

<style scoped>
.dcl { margin-bottom: 0.462rem; }
.dcl-label { font-size: 0.846rem; color: var(--color-text-secondary); display: block; margin-bottom: 0.231rem; }
.dcl-row { display: flex; gap: 0.231rem; margin-bottom: 0.231rem; }
.dcl-select {
  flex: 1; padding: 1px 0.308rem; font-size: 0.923rem; height: 1.538rem;
  border: 1px solid var(--color-border); background: var(--color-bg-surface);
  color: var(--color-text-primary); outline: none; cursor: pointer;
}
.dcl-select:focus { border-color: var(--color-accent); }
.dcl-btn-del {
  width: 1.538rem; height: 1.538rem; font-size: 0.923rem;
  border: 1px solid var(--color-border); background: var(--color-bg-surface);
  color: var(--color-text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.dcl-btn-del:hover { background: var(--color-bg-hover); color: #cc3333; }
.dcl-btn-add {
  font-size: 0.769rem; color: var(--color-accent); background: none; border: none; cursor: pointer; padding: 0;
}
.dcl-btn-add:hover { text-decoration: underline; }
</style>
