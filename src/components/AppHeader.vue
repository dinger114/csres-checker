<script setup lang="ts">
import type { ThemeMode } from '../types'
import { useFirebase } from '../composables/useFirebase'

defineProps<{
  theme: ThemeMode
}>()

defineEmits<{
  'toggle-theme': []
  'show-help': []
}>()

const { globalCount } = useFirebase()
</script>

<template>
  <div class="title-row">
    <h1>标准查新工具</h1>
    <span class="global-count">{{ globalCount }}</span>
    <div class="header-actions">
      <button class="help-btn" @click="$emit('show-help')">
        HELP
      </button>
      <button class="theme-toggle" :aria-label="theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'" @click="$emit('toggle-theme')">
        <svg v-if="theme === 'dark'" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
        <svg v-else class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
        <span>{{ theme === 'dark' ? 'DARK' : 'LIGHT' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.global-count {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 400;
  opacity: 1;
  font-family: var(--font-mono);
  padding: 3px 10px;
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  background: var(--panel);
  letter-spacing: 0.5px;
}

.global-count::before {
  content: 'TOTAL:';
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.help-btn {
  background: var(--panel);
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.25s;
  min-width: 36px;
  height: 36px;
  font-family: var(--font-mono);
  color: var(--text-secondary);
  letter-spacing: 1px;
  font-weight: 600;
}

.help-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--hover-bg);
}

.theme-toggle .icon {
  width: 15px;
  height: 15px;
}
</style>
