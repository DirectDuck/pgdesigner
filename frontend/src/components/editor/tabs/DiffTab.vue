<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import SqlViewer from '../../ui/SqlViewer.vue'

const editor = useEditorStore()

onMounted(() => editor.loadDiff())

const fullSQL = computed(() => {
  if (!editor.diffChanges.length) return ''
  return editor.diffChanges.map((c) => c.sql).join('\n\n')
})

const hazardCount = computed(() => {
  let n = 0
  for (const c of editor.diffChanges) {
    n += (c.hazards?.length || 0)
  }
  return n
})

const actionClass: Record<string, string> = {
  add: 'act-add',
  drop: 'act-drop',
  alter: 'act-alter',
}

const hazardClass: Record<string, string> = {
  dangerous: 'hz-dangerous',
  warning: 'hz-warning',
  info: 'hz-info',
}
</script>

<template>
  <div class="dt-wrap">
    <div class="dt-header">
      <span class="dt-title">
        Changes ({{ editor.diffChanges.length }})
        <span v-if="hazardCount > 0" class="dt-hazard-badge">{{ hazardCount }} hazard{{ hazardCount > 1 ? 's' : '' }}</span>
      </span>
      <button class="dt-refresh" :disabled="editor.diffLoading" @click="editor.loadDiff()">
        {{ editor.diffLoading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <div v-if="!editor.isDirty" class="dt-empty">No unsaved changes</div>
    <template v-else-if="editor.diffChanges.length">
      <!-- Changes list -->
      <div class="dt-changes">
        <div v-for="(ch, i) in editor.diffChanges" :key="i" class="dt-change">
          <div class="dt-change-header">
            <span class="dt-action" :class="actionClass[ch.action]">{{ ch.action.toUpperCase() }}</span>
            <span class="dt-object">{{ ch.object }}</span>
            <span class="dt-name">{{ ch.table ? ch.table + '.' : '' }}{{ ch.name }}</span>
          </div>
          <div v-if="ch.hazards?.length" class="dt-hazards">
            <span v-for="(h, j) in ch.hazards" :key="j" class="dt-hazard" :class="hazardClass[h.level]">
              {{ h.code }}: {{ h.message }}
            </span>
          </div>
        </div>
      </div>

      <!-- Full SQL preview -->
      <div class="dt-sql">
        <SqlViewer :value="fullSQL" />
      </div>
    </template>
    <div v-else-if="!editor.diffLoading" class="dt-empty">No structural changes detected</div>
  </div>
</template>

<style scoped>
.dt-wrap { height: 100%; display: flex; flex-direction: column; }
.dt-header, .dt-changes { user-select: none; }
.dt-header {
  padding: 0.462rem 0.615rem; display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--color-border); background: var(--color-bg-app); flex-shrink: 0;
}
.dt-title { font-size: 0.923rem; font-weight: 600; color: var(--color-text-primary); display: flex; align-items: center; gap: 0.462rem; }
.dt-hazard-badge {
  font-size: 0.769rem; font-weight: 600; padding: 0.077rem 0.385rem;
  border-radius: 0.308rem; background: #cc8800; color: white;
}
.dt-refresh {
  padding: 0.154rem 0.615rem; font-size: 0.846rem;
  border: 1px solid var(--color-menu-border); background: var(--color-bg-surface);
  color: var(--color-text-primary);
}
.dt-refresh:hover:not(:disabled) { background: var(--color-bg-hover); }
.dt-refresh:disabled { opacity: 0.5; }

.dt-changes { padding: 0.462rem; display: flex; flex-direction: column; gap: 0.308rem; flex-shrink: 0; }
.dt-change { padding: 0.308rem 0.462rem; border: 1px solid var(--color-border-subtle); border-radius: 0.231rem; }
.dt-change-header { display: flex; align-items: center; gap: 0.462rem; font-size: 0.846rem; }
.dt-action {
  font-size: 0.692rem; font-weight: 700; padding: 0.077rem 0.308rem;
  border-radius: 0.231rem; text-transform: uppercase;
}
.act-add { background: #2d7a2d; color: white; }
.act-drop { background: #cc3333; color: white; }
.act-alter { background: #cc8800; color: white; }
.dt-object { color: var(--color-text-secondary); font-size: 0.769rem; }
.dt-name { font-weight: 600; color: var(--color-text-primary); }

.dt-hazards { margin-top: 0.231rem; display: flex; flex-direction: column; gap: 0.154rem; }
.dt-hazard { font-size: 0.769rem; padding: 0.154rem 0.308rem; border-radius: 0.154rem; }
.hz-dangerous { background: rgba(204, 51, 51, 0.1); color: #cc3333; }
.hz-warning { background: rgba(204, 136, 0, 0.1); color: #cc8800; }
.hz-info { background: rgba(128, 128, 128, 0.1); color: var(--color-text-secondary); }

.dt-sql { flex: 1; min-height: 0; overflow: auto; border-top: 1px solid var(--color-border); }
.dt-empty { padding: 1.538rem; text-align: center; color: var(--color-text-muted); font-size: 0.923rem; }
</style>
