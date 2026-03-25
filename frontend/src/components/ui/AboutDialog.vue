<script setup lang="ts">
import { ref, watch } from 'vue'
import { DialogRoot, DialogOverlay, DialogContent, DialogTitle, DialogClose } from 'reka-ui'
import type { IAboutInfo } from '@/api/factory'
import api from '@/api/factory'
import { useProjectStore } from '@/stores/project'
import { showToast } from '@/composables/useToast'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const store = useProjectStore()
const info = ref<IAboutInfo | null>(null)
const regEmail = ref('')
const registering = ref(false)

watch(() => props.open, async (v) => {
  if (v && !info.value) {
    info.value = await api.app.about()
  }
})

async function register() {
  const email = regEmail.value.trim()
  if (!email) return
  registering.value = true
  try {
    await api.app.register({ email })
    await store.loadAll()
  } catch (e) {
    showToast(e instanceof Error ? e.message : String(e), 'error')
  } finally {
    registering.value = false
  }
}
</script>

<template>
  <DialogRoot :open="open">
    <DialogOverlay class="abt-overlay" @click="emit('close')" />
    <DialogContent class="abt-box" @escape-key-down="emit('close')">
      <DialogClose class="abt-close" @click="emit('close')">&times;</DialogClose>

      <div v-if="info" class="abt-content">
        <div class="abt-logo">
          <svg class="abt-icon" width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="14" y="14" width="36" height="36" rx="10" fill="#2F5D7C"/>
            <rect x="22" y="24" width="20" height="3" rx="1.5" fill="#FFFFFF"/>
            <rect x="22" y="30" width="14" height="3" rx="1.5" fill="#FFFFFF" opacity="0.7"/>
            <rect x="22" y="36" width="18" height="3" rx="1.5" fill="#FFFFFF" opacity="0.4"/>
          </svg>
          <div class="abt-text">
            <DialogTitle class="abt-name">{{ info.name }}</DialogTitle>
            <div class="abt-desc">{{ info.description }}</div>
          </div>
        </div>

        <table class="abt-table">
          <tr><td class="abt-label">Version</td><td class="abt-value">{{ info.version }}</td></tr>
          <tr><td class="abt-label">Target</td><td class="abt-value">{{ info.target }}</td></tr>
          <tr><td class="abt-label">Go</td><td class="abt-value">{{ info.goVersion }}</td></tr>
          <tr><td class="abt-label">Author</td><td class="abt-value">{{ info.author }}</td></tr>
          <tr><td class="abt-label">License</td><td class="abt-value">{{ info.license }}</td></tr>
          <tr>
            <td class="abt-label">Website</td>
            <td class="abt-value"><a :href="info.website" target="_blank" class="abt-link">{{ info.website.replace('https://', '') }}</a></td>
          </tr>
          <tr>
            <td class="abt-label">GitHub</td>
            <td class="abt-value"><a :href="info.github" target="_blank" class="abt-link">{{ info.github.replace('https://', '') }}</a></td>
          </tr>
        </table>
        <div class="abt-reg">
          <template v-if="store.info?.isRegistered">
            <div class="abt-reg-ok">Registered</div>
          </template>
          <template v-else>
            <div class="abt-reg-label">Registration</div>
            <div class="abt-reg-row">
              <input v-model="regEmail" class="abt-reg-input" placeholder="Email" @keydown.enter="register" />
              <button class="abt-reg-btn" :disabled="registering || !regEmail.trim()" @click="register">Register</button>
            </div>
          </template>
        </div>
      </div>
      <div v-else class="abt-loading">Loading...</div>
    </DialogContent>
  </DialogRoot>
</template>

<style scoped>
.abt-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.3); z-index: 40; }
.abt-box {
  position: fixed; z-index: 50;
  top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 23.077rem; background: var(--color-bg-surface);
  border: 1px solid var(--color-menu-border);
  box-shadow: 0 4px 16px rgba(0,0,0,.25);
  padding: 1.538rem;
}
.abt-close {
  position: absolute; top: 0.462rem; right: 0.462rem;
  width: 1.538rem; height: 1.538rem; display: flex; align-items: center; justify-content: center;
  color: var(--color-text-secondary); font-size: 1.077rem;
}
.abt-close:hover { background: var(--color-bg-hover); }

.abt-content { display: flex; flex-direction: column; gap: 1.231rem; }
.abt-logo { display: flex; align-items: center; gap: 0.769rem; }
.abt-icon { flex-shrink: 0; }
.abt-text { display: flex; flex-direction: column; }
.abt-name { font-size: 1.385rem; font-weight: 700; color: var(--color-text-primary); margin: 0; }
.abt-desc { font-size: 0.846rem; color: var(--color-text-secondary); margin-top: 0.154rem; }

.abt-table { width: 100%; border-collapse: collapse; }
.abt-table tr { border-bottom: 1px solid var(--color-border-subtle); }
.abt-table tr:last-child { border-bottom: none; }
.abt-label {
  padding: 0.308rem 0; font-size: 0.846rem; font-weight: 600;
  color: var(--color-text-secondary); width: 5.385rem; vertical-align: top;
}
.abt-value { padding: 0.308rem 0; font-size: 0.846rem; color: var(--color-text-primary); }
.abt-link { color: var(--color-accent); text-decoration: none; }
.abt-link:hover { text-decoration: underline; }
.abt-loading { text-align: center; padding: 1.538rem; color: var(--color-text-muted); font-size: 0.923rem; }

.abt-reg { margin-top: 0.308rem; padding-top: 0.769rem; border-top: 1px solid var(--color-border-subtle); }
.abt-reg-label { font-size: 0.769rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 0.308rem; }
.abt-reg-row { display: flex; gap: 0.308rem; }
.abt-reg-input {
  flex: 1; padding: 0.308rem 0.462rem; font-size: 0.846rem;
  background: var(--color-bg-input); border: 1px solid var(--color-border);
  color: var(--color-text-primary); outline: none;
}
.abt-reg-input:focus { border-color: var(--color-accent); }
.abt-reg-btn {
  padding: 0.308rem 0.615rem; font-size: 0.846rem; cursor: pointer;
  background: var(--color-accent); color: white; border: none;
}
.abt-reg-btn:disabled { opacity: 0.5; cursor: default; }
.abt-reg-btn:hover:not(:disabled) { opacity: 0.9; }
.abt-reg-ok { font-size: 0.846rem; color: var(--color-text-secondary); }
</style>
