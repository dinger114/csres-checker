<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  running: boolean
  hasResults: boolean
  hasKeywords: boolean
  showImport?: boolean
}>()

const emit = defineEmits<{
  'run': []
  'import': []
  'copy-md': []
  'export-xlsx': []
  'share': []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="btn-row">
    <button class="btn-run" :disabled="running" @click="emit('run')">
      <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      <span class="btn-text">{{ t('input.btn_run') }}</span>
    </button>
    <button v-if="showImport" :disabled="running" @click="emit('import')">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
      <span class="btn-text">{{ t('input.btn_import') }}</span>
    </button>
    <button :disabled="running || !hasResults" @click="emit('copy-md')">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
      <span class="btn-text">{{ t('input.btn_md') }}</span>
    </button>
    <button :disabled="running || !hasResults" @click="emit('export-xlsx')">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
      <span class="btn-text">{{ t('input.btn_xlsx') }}</span>
    </button>
    <button :disabled="running || !hasKeywords" @click="emit('share')">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
      <span class="btn-text">{{ t('input.btn_share') }}</span>
    </button>
  </div>
</template>

<style scoped>
.icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.btn-run {
  background: var(--primary) !important;
  color: var(--bg) !important;
  border-color: var(--primary) !important;
}

.btn-run:hover {
  opacity: 0.9;
}

@media (max-width: 640px) {
  .btn-text {
    display: none;
  }

  .btn-row button {
    padding: 8px;
    min-width: 44px;
    justify-content: center;
  }
}

@media (max-width: 375px) {
  .btn-row { gap: 4px; }
  .btn-row button { min-width: 40px; padding: 6px; }
}
</style>
