<template>
  <div class="title-row">
    <h1>标准查新工具</h1>
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

defineProps<{
  theme: ThemeMode
}>()

defineEmits<{
  'toggle-theme': []
  'show-help': []
}>()
</script>

<style scoped>
.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.help-btn {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 10px;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 20px;
  transition: all 0.3s;
  font-family: inherit;
  letter-spacing: 1px;
}

.help-btn:hover {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
</style>
