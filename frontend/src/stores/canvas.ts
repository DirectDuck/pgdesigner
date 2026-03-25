import { ref } from 'vue'
import { defineStore } from 'pinia'

export type CanvasTool = 'pointer' | 'createTable' | 'createFK' | 'createM2M'

export const useCanvasStore = defineStore('canvas', () => {
  const zoom = ref(100)
  const activeSchema = ref<string | null>(null) // null = show all schemas
  const pendingAction = ref<string | null>(null)
  const focusNodeName = ref<string | null>(null)
  const activeTool = ref<CanvasTool>('pointer')
  const toolSourceNode = ref<string | null>(null) // first click for FK/M2M

  function setTool(tool: CanvasTool) {
    activeTool.value = tool
    toolSourceNode.value = null
  }
  function resetTool() { setTool('pointer') }

  function zoomIn() { pendingAction.value = 'zoomIn' }
  function zoomOut() { pendingAction.value = 'zoomOut' }
  function resetZoom() { pendingAction.value = 'resetZoom' }
  function fitToScreen() { pendingAction.value = 'fitToScreen' }
  function fixOverlaps() { pendingAction.value = 'fixOverlaps' }
  function autoLayout() { pendingAction.value = 'autoLayout' }
  function clusterTables() { pendingAction.value = 'clusterTables' }
  function focusNode(name: string) { focusNodeName.value = name; pendingAction.value = 'focusNode' }
  function consumeAction() { const a = pendingAction.value; pendingAction.value = null; return a }

  return { zoom, activeSchema, pendingAction, focusNodeName, activeTool, toolSourceNode, zoomIn, zoomOut, resetZoom, fitToScreen, fixOverlaps, autoLayout, clusterTables, focusNode, consumeAction, setTool, resetTool }
})
