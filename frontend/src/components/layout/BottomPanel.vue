<script setup lang="ts">
import { ref, watch } from 'vue'
import { useProjectStore } from '@/stores/project'

const store = useProjectStore()
const activeTab = ref('ddl')

const tabs = [
  { id: 'ddl', label: 'DDL Preview' },
  { id: 'check', label: 'Check' },
  { id: 'output', label: 'Output' },
]

// Load DDL when tab is activated
watch(activeTab, (tab) => {
  if (tab === 'ddl' && !store.ddl) {
    store.loadDDL()
  }
})
</script>

<template>
  <div class="h-full flex flex-col bg-white border-t border-gray-300">
    <!-- Tab headers -->
    <div class="h-6 bg-[#e8e8e8] border-b border-gray-300 flex items-center shrink-0 select-none">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="px-3 h-full text-xs border-r border-gray-300"
        :class="activeTab === tab.id ? 'bg-white font-semibold' : 'hover:bg-[#d8d8d8]'"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab content -->
    <div class="flex-1 overflow-auto p-2 text-xs font-mono">
      <template v-if="activeTab === 'ddl'">
        <pre v-if="store.ddl" class="text-gray-700 whitespace-pre-wrap">{{ store.ddl }}</pre>
        <pre v-else class="text-gray-400">-- Loading DDL...</pre>
      </template>
      <template v-else-if="activeTab === 'check'">
        <div class="text-gray-500">Run Check Diagram (F4) to validate schema</div>
      </template>
      <template v-else>
        <div class="text-gray-500">No output yet</div>
      </template>
    </div>
  </div>
</template>
