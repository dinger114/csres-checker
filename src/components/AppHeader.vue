<template>
  <div class="title-row">
    <h1>标准查新工具</h1>
    <span class="global-count">{{ globalCount }}</span>
    <div class="header-actions">
      <button class="help-btn" @click="$emit('show-help')">HELP</button>
      <button class="theme-toggle" @click="$emit('toggle-theme')">
        <span class="icon">{{ theme === 'dark' ? '🌙' : '☀️' }}</span>
        <span>{{ theme === 'dark' ? 'DARK' : 'LIGHT' }}</span>
      </button>
    </div>
  </div>
</template>

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

<style scoped>
.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.global-count {
  font-size: 11px;
  color: var(--text-dim);
  font-weight: 400;
  opacity: 0.5;
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
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.3s;
  min-width: 36px;
  height: 36px;
  font-family: inherit;
  color: var(--text-dim);
  letter-spacing: 1px;
}

.help-btn:hover {
  background: var(--primary);
  color: #fff;
}
</style>
