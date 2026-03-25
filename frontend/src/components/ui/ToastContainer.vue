<script setup lang="ts">
import { useToastState } from '@/composables/useToast'

const { toasts, dismissToast } = useToastState()
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <div
        v-for="t in toasts" :key="t.id"
        class="toast-item" :class="'toast-' + t.type"
        @click="dismissToast(t.id)"
      >
        {{ t.message }}
      </div>
    </div>
  </Teleport>
</template>

<style>
.toast-container {
  position: fixed; bottom: 2.5rem; right: 1rem; z-index: 100;
  display: flex; flex-direction: column; gap: 0.308rem;
  pointer-events: none; max-width: 26rem;
}
.toast-item {
  padding: 0.462rem 0.923rem; font-size: 0.846rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface); color: var(--color-text-primary);
  box-shadow: 0 2px 8px rgba(0,0,0,.15);
  pointer-events: auto; cursor: pointer;
  animation: toast-in 0.2s ease-out;
}
.toast-error { border-left: 3px solid #cc3333; }
.toast-info { border-left: 3px solid var(--color-accent); }
@keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
</style>
