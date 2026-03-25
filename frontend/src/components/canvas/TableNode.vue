<script setup lang="ts">
/**
 * Custom Vue Flow node — pgmdd-style table card.
 * CSS-only icons (no inline SVG, no v-html, no getComputedStyle).
 */
defineProps<{
  data: {
    name: string
    columns: Array<{ name: string; type: string; pk?: boolean; nn?: boolean; fk?: boolean; default?: string }>
    indexes: Array<{ name: string }>
    partitioned?: boolean
    partitionCount?: number
  }
}>()

function colIconClass(col: { pk?: boolean; fk?: boolean; nn?: boolean }) {
  if (col.pk) return 'icon-pk'
  if (col.fk) return 'icon-fk'
  if (col.nn) return 'icon-nn'
  return 'icon-null'
}
</script>

<template>
  <div class="table-node">
    <div class="table-header">
      <span class="icon-table"></span>
      <span class="table-header-name">{{ data.name }}</span>
      <span v-if="data.partitioned" class="table-header-badge">partitioned</span>
    </div>

    <table class="table-columns">
      <tr v-for="col in data.columns" :key="col.name" class="col-row">
        <td><span :class="colIconClass(col)"></span></td>
        <td class="col-name">{{ col.name }}</td>
        <td class="col-type">{{ col.type }}</td>
        <td class="col-default">{{ col.default || '' }}</td>
        <td class="col-flags">
          <span v-if="col.nn" class="flag-nn">(NN) </span>
          <span v-if="col.fk" class="flag-fk">(FK)</span>
        </td>
      </tr>
    </table>

    <div v-if="data.indexes?.length" class="table-indexes">
      <div v-for="idx in data.indexes" :key="idx.name" class="idx-row">
        <span class="icon-index"></span>
        {{ idx.name }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.table-node {
  background: var(--color-table-bg);
  border: 1px solid var(--color-table-border);
  min-width: 140px;
  font-family: Verdana, Tahoma, 'MS Sans Serif', Geneva, sans-serif;
  contain: layout style paint;
}

.table-header {
  background: var(--color-table-header-bg); border-bottom: 1px solid var(--color-table-border);
  padding: 4px 8px; display: flex; align-items: center; gap: 5px;
}
.table-header-name { font-weight: 700; font-size: 12px; color: var(--color-table-col-name); }
.table-header-badge {
  font-size: 9px; font-weight: 400; color: var(--color-table-col-type);
  background: var(--color-bg-app); border: 0.5px solid var(--color-table-border);
  padding: 0 3px; border-radius: 2px; margin-left: auto;
}

/* ── CSS-only icons (replace 2500+ inline SVGs) ───────────────── */
.icon-table, .icon-pk, .icon-fk, .icon-nn, .icon-null, .icon-index {
  display: inline-block; flex-shrink: 0; vertical-align: middle;
}

/* Table icon: grid rectangle */
.icon-table {
  width: 13px; height: 12px;
  border: 1px solid var(--color-icon-table-stroke);
  background: var(--color-icon-table-fill);
  background-image:
    linear-gradient(var(--color-icon-table-stroke) 1px, transparent 1px),
    linear-gradient(90deg, var(--color-icon-table-stroke) 1px, transparent 1px);
  background-size: 100% 4px, 4px 100%;
  background-position: 0 3px, 3px 3px;
  background-repeat: no-repeat, no-repeat;
}

/* PK icon: key-like circle + stem */
.icon-pk {
  width: 12px; height: 13px; position: relative;
}
.icon-pk::before {
  content: ''; position: absolute; top: 0; left: 2px;
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--color-icon-pk-fill); border: 1.2px solid var(--color-icon-pk-stroke);
  box-sizing: border-box;
}
.icon-pk::after {
  content: ''; position: absolute; top: 6px; left: 4px;
  width: 1.3px; height: 7px;
  background: var(--color-icon-pk-stroke);
}

/* FK icon: key + arrow */
.icon-fk {
  width: 13px; height: 13px; position: relative;
}
.icon-fk::before {
  content: ''; position: absolute; top: 0; left: 1px;
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--color-icon-fk-fill); border: 1px solid var(--color-icon-fk-stroke);
  box-sizing: border-box;
}
.icon-fk::after {
  content: ''; position: absolute; top: 6px; left: 3px;
  width: 1.2px; height: 7px;
  background: var(--color-icon-fk-stroke);
}

/* NN icon: two-tone rect */
.icon-nn {
  width: 12px; height: 11px;
  background: linear-gradient(90deg, var(--color-icon-nn-left) 50%, var(--color-icon-nn-right) 50%);
  border: 0.5px solid var(--color-icon-fk-stroke);
}

/* Nullable icon: two-tone rect */
.icon-null {
  width: 12px; height: 11px;
  background: linear-gradient(90deg, var(--color-icon-null-left) 50%, var(--color-icon-null-right) 50%);
  border: 0.5px solid var(--color-icon-fk-stroke);
}

/* Index icon: lined rect */
.icon-index {
  width: 12px; height: 12px;
  background: var(--color-icon-index-fill);
  border: 0.7px solid var(--color-icon-index-stroke);
  background-image: repeating-linear-gradient(
    180deg,
    transparent 2px, transparent 3px,
    #fff 3px, #fff 4px
  );
}

.table-columns { border-collapse: collapse; width: 100%; padding: 1px 0; }
.col-row { font-size: 12px; line-height: 17px; }
.col-row td { padding: 0 2px; vertical-align: middle; }
.col-row:first-child td { padding-top: 2px; }
.col-row:last-child td { padding-bottom: 2px; }

.col-name { font-weight: 500; color: var(--color-table-col-name); white-space: nowrap; padding-right: 10px !important; }
.col-type { color: var(--color-table-col-type); white-space: nowrap; padding-right: 6px !important; }
.col-default { color: var(--color-table-col-default); font-size: 10px; white-space: nowrap; padding-right: 6px !important; }
.col-flags { white-space: nowrap; padding-left: 4px !important; padding-right: 6px !important; }
.flag-nn { color: var(--color-flag-nn); font-size: 11px; }
.flag-fk { color: var(--color-flag-fk); font-size: 11px; }

.table-indexes { border-top: 1px solid var(--color-table-index-border); padding: 0; }
.idx-row {
  display: flex; align-items: center; padding: 1px 6px 1px 3px;
  font-size: 12px; line-height: 17px; color: var(--color-table-index-text); gap: 3px;
}
</style>
