<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { DialogRoot, DialogOverlay, DialogContent, DialogTitle, DialogClose } from 'reka-ui'
import { useProjectStore } from '@/stores/project'
import { useUiStore } from '@/stores/ui'
import type { ILintIssue } from '@/api/factory'

const store = useProjectStore()
const ui = useUiStore()

const isOpen = computed(() => ui.activeDialog === 'lint')
const selected = ref<Set<number>>(new Set())
const busy = ref(false)
const activeTab = ref<'issues' | 'ignored'>('issues')

watch(isOpen, (open) => {
  if (open) {
    activeTab.value = 'issues'
    selected.value = new Set()
    store.loadLint()
    store.loadIgnoredRules()
  }
})

function switchTab(tab: 'issues' | 'ignored') {
  activeTab.value = tab
  selected.value = new Set()
  if (tab === 'ignored') {
    store.loadIgnoredRules()
  }
}

function close() {
  ui.closeDialog()
}

const summary = computed(() => {
  let errors = 0, warnings = 0, infos = 0
  for (const i of store.lintIssues) {
    if (i.severity === 'error') errors++
    else if (i.severity === 'warning') warnings++
    else infos++
  }
  return { errors, warnings, infos, total: store.lintIssues.length }
})

// Selection
const allSelected = computed(() => {
  return store.lintIssues.length > 0 && selected.value.size === store.lintIssues.length
})

function toggleSelectAll() {
  if (allSelected.value) {
    selected.value = new Set()
  } else {
    selected.value = new Set(store.lintIssues.map((_, i) => i))
  }
}

function toggleSelect(idx: number) {
  const s = new Set(selected.value)
  if (s.has(idx)) {
    s.delete(idx)
  } else {
    s.add(idx)
  }
  selected.value = s
}

// Counts for toolbar buttons
const selectedFixableCount = computed(() => {
  let n = 0
  for (const idx of selected.value) {
    if (store.lintIssues[idx]?.fixable) n++
  }
  return n
})

const selectedCount = computed(() => selected.value.size)

// Actions
async function withBusy(fn: () => Promise<void>) {
  busy.value = true
  try {
    await fn()
  } finally {
    selected.value = new Set()
    busy.value = false
  }
}

async function fixSelected() {
  const issues = [...selected.value]
    .map(i => store.lintIssues[i])
    .filter((i): i is ILintIssue => !!i?.fixable)
    .map(i => ({ code: i.code, path: i.path }))
  if (!issues.length) return
  await withBusy(() => store.fixLintIssues(issues).then(() => {}))
}

async function fixSingle(issue: ILintIssue) {
  await withBusy(() => store.fixLintIssues([{ code: issue.code, path: issue.path }]).then(() => {}))
}

async function ignoreSingle(issue: ILintIssue) {
  const table = parseTable(issue.path)
  await withBusy(() => store.ignoreLintRules([issue.code], table))
}

async function ignoreSelected() {
  const byTable = new Map<string | undefined, Set<string>>()
  for (const idx of selected.value) {
    const issue = store.lintIssues[idx]
    if (!issue) continue
    const table = parseTable(issue.path)
    if (!byTable.has(table)) byTable.set(table, new Set())
    byTable.get(table)!.add(issue.code)
  }
  await withBusy(async () => {
    for (const [table, codes] of byTable) {
      await store.ignoreLintRules([...codes], table)
    }
  })
}

async function recheck() {
  await withBusy(() => store.loadLint())
}

async function unignore(code: string, scope: string) {
  await withBusy(() => store.unignoreLintRule(code, scope))
}

// Path navigation — resolve table name from path, checking it exists in the schema
const tableNames = computed(() => {
  if (!store.schema?.tables) return new Set<string>()
  return new Set(store.schema.tables.map(t => t.name))
})

function resolveTable(path: string): string | undefined {
  const parts = path.split('.')
  if (parts.length < 2 || !parts[1]) return undefined
  // Direct table match (schema.table or schema.table.column)
  if (tableNames.value.has(parts[1])) return parts[1]
  // For index paths (schema.indexName) — try to extract table from message later
  return undefined
}

function resolveIssueTable(issue: ILintIssue): string | undefined {
  let table = resolveTable(issue.path)
  if (!table) {
    // For index issues, extract table from message: `on table "tableName"`
    const m = issue.message.match(/on table "([^"]+)"/)
    if (m?.[1] && tableNames.value.has(m[1])) table = m[1]
  }
  return table
}

function isNavigable(issue: ILintIssue): boolean {
  return resolveIssueTable(issue) !== undefined
}

function navigateToPath(issue: ILintIssue) {
  const table = resolveIssueTable(issue)
  if (!table) return
  ui.openTableEditor(table)
  close()
}

function parseTable(path: string): string | undefined {
  const parts = path.split('.')
  if (parts.length >= 2) return parts[1]
  return undefined
}

function severityClass(s: string) {
  switch (s) {
    case 'error': return 'sev-error'
    case 'warning': return 'sev-warning'
    default: return 'sev-info'
  }
}

function severityIcon(s: string) {
  switch (s) {
    case 'error': return 'E'
    case 'warning': return 'W'
    default: return 'I'
  }
}
</script>

<template>
  <DialogRoot :open="isOpen">
    <DialogOverlay class="dlg-overlay" @click="close" />
    <DialogContent class="dlg-box" @escape-key-down="close">
      <div class="dlg-header">
        <DialogTitle class="text-xs font-semibold">
          Check Diagram — {{ summary.errors }} errors, {{ summary.warnings }} warnings, {{ summary.infos }} info
        </DialogTitle>
        <DialogClose class="dlg-close" @click="close">&times;</DialogClose>
      </div>

      <div class="dlg-tabs">
        <button
          class="dlg-tab" :class="{ active: activeTab === 'issues' }"
          @click="switchTab('issues')"
        >Issues ({{ store.lintIssues.length }})</button>
        <button
          class="dlg-tab" :class="{ active: activeTab === 'ignored' }"
          @click="switchTab('ignored')"
        >Ignored ({{ store.ignoredRules.length }})</button>
      </div>

      <!-- Issues tab -->
      <template v-if="activeTab === 'issues'">
        <div class="dlg-toolbar">
          <button class="dlg-btn" :disabled="busy || !selectedFixableCount" @click="fixSelected">
            Fix Selected ({{ selectedFixableCount }})
          </button>
          <button class="dlg-btn" :disabled="busy || !selectedCount" @click="ignoreSelected">
            Ignore Selected ({{ selectedCount }})
          </button>
          <button class="dlg-btn" :disabled="busy" @click="recheck">Re-check</button>
        </div>

        <div class="dlg-body">
          <table v-if="store.lintIssues.length" class="issue-table">
            <thead>
              <tr>
                <th class="col-chk">
                  <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" />
                </th>
                <th class="col-sev"></th>
                <th class="col-code text-left">Code</th>
                <th class="col-path text-left">Path</th>
                <th class="text-left">Message</th>
                <th class="col-act"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(issue, idx) in store.lintIssues" :key="idx">
                <td class="col-chk">
                  <input type="checkbox" :checked="selected.has(idx)" @change="toggleSelect(idx)" />
                </td>
                <td class="col-sev text-center font-bold" :class="severityClass(issue.severity)">
                  {{ severityIcon(issue.severity) }}
                </td>
                <td class="col-code font-mono" style="color: var(--color-text-secondary)">{{ issue.code }}</td>
                <td class="col-path">
                  <span
                    v-if="isNavigable(issue)"
                    class="path-link"
                    @click="navigateToPath(issue)"
                  >{{ issue.path }}</span>
                  <span v-else>{{ issue.path }}</span>
                </td>
                <td>{{ issue.message }}</td>
                <td class="col-act">
                  <button v-if="issue.fixable" class="act-btn act-fix" :disabled="busy" @click="fixSingle(issue)">Fix</button>
                  <button class="act-btn act-ign" :disabled="busy" @click="ignoreSingle(issue)">Ign</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-msg">No issues found.</div>
        </div>
      </template>

      <!-- Ignored tab -->
      <template v-else>
        <div class="dlg-body">
          <table v-if="store.ignoredRules.length" class="issue-table">
            <thead>
              <tr>
                <th class="col-scope text-left">Scope</th>
                <th class="col-code text-left">Code</th>
                <th class="text-left">Title</th>
                <th class="col-unign"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(rule, idx) in store.ignoredRules" :key="idx">
                <td class="col-scope font-mono" style="color: var(--color-text-secondary)">{{ rule.scope }}</td>
                <td class="col-code font-mono" style="color: var(--color-text-secondary)">{{ rule.code }}</td>
                <td>{{ rule.title }}</td>
                <td class="col-unign">
                  <button class="act-btn act-unign" :disabled="busy" @click="unignore(rule.code, rule.scope)">Unignore</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-msg">No ignored rules.</div>
        </div>
      </template>

      <div class="dlg-footer">
        <button class="dlg-btn" @click="close">Close</button>
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

.dlg-tabs {
  display: flex; gap: 0; background: var(--color-bg-app); border-bottom: 1px solid var(--color-border); flex-shrink: 0;
  padding: 0 0.308rem;
}
.dlg-tab {
  padding: 0.308rem 0.923rem; font-size: 0.923rem; cursor: default; border: none; background: none;
  color: var(--color-text-secondary); border-bottom: 2px solid transparent; margin-bottom: -1px;
}
.dlg-tab:hover { color: var(--color-text-primary); }
.dlg-tab.active { color: var(--color-text-primary); border-bottom-color: var(--color-accent, #4488cc); }

.dlg-toolbar {
  display: flex; align-items: center; gap: 0.308rem; padding: 0.308rem 0.615rem;
  background: var(--color-bg-app); border-bottom: 1px solid var(--color-border); flex-shrink: 0;
}
.dlg-body { flex: 1; min-height: 0; overflow: auto; }
.dlg-footer {
  height: 2.154rem; background: var(--color-bg-app); border-top: 1px solid var(--color-border);
  display: flex; align-items: center; justify-content: flex-end; padding: 0 0.615rem; flex-shrink: 0;
}
.dlg-btn {
  padding: 0 0.923rem; height: 1.538rem; font-size: 0.923rem;
  border: 1px solid var(--color-menu-border); background: var(--color-bg-surface);
  color: var(--color-text-primary);
}
.dlg-btn:hover:not(:disabled) { background: var(--color-bg-hover); }
.dlg-btn:disabled { opacity: 0.4; cursor: default; }

.issue-table { width: 100%; border-collapse: collapse; font-size: 0.923rem; color: var(--color-text-primary); }
.issue-table thead { background: var(--color-bg-app); position: sticky; top: 0; z-index: 1; }
.issue-table th { padding: 0.154rem 0.308rem; font-weight: 600; border-bottom: 1px solid var(--color-border); }
.issue-table td { padding: 0.154rem 0.308rem; }
.issue-table tbody tr { border-bottom: 1px solid var(--color-border-subtle); }
.issue-table tbody tr:hover { background: var(--color-bg-selected); }

.col-chk { width: 1.538rem; text-align: center; }
.col-sev { width: 1.538rem; }
.col-code { width: 3.846rem; }
.col-path { width: 30%; }
.col-act { width: 5.385rem; white-space: nowrap; text-align: right; }
.col-scope { width: 8rem; }
.col-unign { width: 5.385rem; text-align: right; }

.sev-error { color: #cc3333; }
.sev-warning { color: #cc8800; }
.sev-info { color: #3366aa; }

.path-link { cursor: pointer; text-decoration: underline; text-decoration-style: dotted; }
.path-link:hover { color: var(--color-accent); }

.empty-msg { padding: 1rem; font-size: 0.923rem; color: var(--color-text-muted); }

.act-btn {
  padding: 0 0.462rem; height: 1.231rem; font-size: 0.769rem; border: 1px solid var(--color-menu-border);
  background: var(--color-bg-surface); color: var(--color-text-primary); margin-left: 0.154rem;
}
.act-btn:hover:not(:disabled) { background: var(--color-bg-hover); }
.act-btn:disabled { opacity: 0.4; cursor: default; }
.act-fix { color: #2266aa; }
.act-ign { color: var(--color-text-secondary); }
.act-unign { color: #cc8800; }
</style>
