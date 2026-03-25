<script setup lang="ts">
/**
 * Batch edge — renders ALL edges in a single Vue component.
 * Individual paths for click handling, labels as SVG text.
 */
import type { EdgeProps } from '@vue-flow/core'
import type { EdgeItem } from './erd-engine'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const props = defineProps<EdgeProps>()
const emit = defineEmits<{
  (e: 'edgeClick', name: string, from: string, to: string): void
}>()

function onEdgeClick(edge: EdgeItem) {
  emit('edgeClick', edge.name, edge.from, edge.to)
}
</script>

<template>
  <template v-for="edge in data?.edges" :key="edge.name">
    <path
      :d="edge.path"
      :stroke="edge.gray ? 'var(--color-line-gray)' : 'var(--color-line-default)'"
      stroke-width="1"
      fill="none"
      class="batch-edge-path"
      @click.stop="onEdgeClick(edge)"
    />
    <rect
      :x="edge.labelX - (edge.name.length * 5.5 + 8) / 2"
      :y="edge.labelY - 8"
      :width="edge.name.length * 5.5 + 8"
      height="16"
      fill="var(--color-bg-surface)"
      stroke="var(--color-border-strong)"
      stroke-width="0.5"
      class="batch-edge-label-bg"
      @click.stop="onEdgeClick(edge)"
    />
    <text
      :x="edge.labelX"
      :y="edge.labelY + 3.5"
      text-anchor="middle"
      font-size="10"
      font-family="Verdana, sans-serif"
      :fill="edge.gray ? 'var(--color-line-gray)' : 'var(--color-line-default)'"
      class="batch-edge-label"
      @click.stop="onEdgeClick(edge)"
    >{{ edge.name }}</text>
  </template>
</template>

<style>
.batch-edge-path { cursor: pointer; pointer-events: stroke; }
.batch-edge-path:hover { stroke-width: 2 !important; }
.batch-edge-label-bg { cursor: pointer; }
.batch-edge-label { cursor: pointer; }
</style>
