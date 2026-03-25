<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useProjectStore } from '@/stores/project'
import type { ILintIssue } from '@/api/factory'

const editor = useEditorStore()
const project = useProjectStore()
const busy = ref(false)

onMounted(() => {
  if (editor.lintIssues.length === 0) editor.loadLint()
})

async function fixIssue(issue: ILintIssue) {
  busy.value = true
  try {
    await project.fixLintIssues([{ code: issue.code, path: issue.path }])
    // Reload table data (fix changed the project) + lint
    if (editor.tableName) await editor.openTable(editor.tableName)
  } finally {
    busy.value = false
  }
}

async function ignoreIssue(issue: ILintIssue) {
  const parts = issue.path.split('.')
  const table = parts.length >= 2 ? parts[1] : undefined
  busy.value = true
  try {
    await project.ignoreLintRules([issue.code], table)
    await editor.loadLint()
  } finally {
    busy.value = false
  }
}

const severityIcon: Record<string, string> = {
  error: 'x',
  warning: '!',
  info: 'i',
}
const severityClass: Record<string, string> = {
  error: 'sev-error',
  warning: 'sev-warning',
  info: 'sev-info',
}
</script>

<template>
  <div class="lt-wrap">
    <div class="lt-header">
      <span class="lt-title">Lint Issues</span>
      <button class="lt-refresh" :disabled="editor.lintLoading || busy" @click="editor.loadLint()">
        {{ editor.lintLoading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>
    <table v-if="editor.lintIssues.length" class="lt-table">
      <thead>
        <tr>
          <th class="lt-th" style="width: 28px"></th>
          <th class="lt-th" style="width: 52px">Code</th>
          <th class="lt-th" style="width: 30%">Path</th>
          <th class="lt-th">Message</th>
          <th class="lt-th" style="width: 80px"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(issue, i) in editor.lintIssues" :key="i" class="lt-row">
          <td class="lt-cell text-center">
            <span class="lt-sev" :class="severityClass[issue.severity]">{{ severityIcon[issue.severity] || '?' }}</span>
          </td>
          <td class="lt-cell lt-code">{{ issue.code }}</td>
          <td class="lt-cell lt-path">{{ issue.path }}</td>
          <td class="lt-cell">{{ issue.message }}</td>
          <td class="lt-cell lt-actions">
            <button v-if="issue.fixable" class="lt-act lt-act-fix" :disabled="busy" @click="fixIssue(issue)">Fix</button>
            <button class="lt-act lt-act-ign" :disabled="busy" @click="ignoreIssue(issue)">Ign</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else-if="!editor.lintLoading" class="lt-empty">No issues found</div>
  </div>
</template>

<style scoped>
.lt-wrap { height: 100%; display: flex; flex-direction: column; }
.lt-header {
  padding: 0.462rem 0.615rem; display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--color-border); background: var(--color-bg-app); flex-shrink: 0;
}
.lt-title { font-size: 0.923rem; font-weight: 600; color: var(--color-text-primary); }
.lt-refresh {
  padding: 0.154rem 0.615rem; font-size: 0.846rem;
  border: 1px solid var(--color-menu-border); background: var(--color-bg-surface);
  color: var(--color-text-primary);
}
.lt-refresh:hover:not(:disabled) { background: var(--color-bg-hover); }
.lt-refresh:disabled { opacity: 0.5; }
.lt-table { width: 100%; border-collapse: collapse; font-size: 0.846rem; }
.lt-th {
  padding: 0.154rem 0.462rem; font-weight: 600; text-align: left;
  border-bottom: 1px solid var(--color-border); background: var(--color-bg-app);
  position: sticky; top: 0;
}
.lt-row:hover { background: var(--color-bg-hover); }
.lt-cell { padding: 0.154rem 0.462rem; border-bottom: 1px solid var(--color-border-subtle); color: var(--color-text-primary); }
.lt-code { font-family: monospace; color: var(--color-text-secondary); }
.lt-path { color: var(--color-text-secondary); }
.lt-actions { white-space: nowrap; text-align: right; }
.lt-sev {
  display: inline-flex; align-items: center; justify-content: center;
  width: 1.077rem; height: 1.077rem; border-radius: 50%; font-size: 0.692rem; font-weight: 700;
}
.sev-error { background: #cc3333; color: white; }
.sev-warning { background: #cc8800; color: white; }
.sev-info { background: var(--color-text-muted); color: var(--color-bg-surface); }
.lt-empty { padding: 1.538rem; text-align: center; color: var(--color-text-muted); font-size: 0.923rem; }

.lt-act {
  padding: 0 0.462rem; height: 1.231rem; font-size: 0.769rem; border: 1px solid var(--color-menu-border);
  background: var(--color-bg-surface); color: var(--color-text-primary); margin-left: 0.154rem;
}
.lt-act:hover:not(:disabled) { background: var(--color-bg-hover); }
.lt-act:disabled { opacity: 0.4; cursor: default; }
.lt-act-fix { color: #2266aa; }
.lt-act-ign { color: var(--color-text-secondary); }
</style>
