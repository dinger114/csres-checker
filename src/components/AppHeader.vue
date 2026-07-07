<template>
  <header class="app-header">
    <div class="header-left">
      <span class="logo">📋</span>
      <h1 class="title">标准查新工具</h1>
    </div>
    <div class="header-right">
      <n-button size="small" @click="$emit('toggle-theme')">
        <span class="theme-icon">{{ theme === 'dark' ? '🌙' : '☀️' }}</span>
        {{ theme === 'dark' ? '暗色' : '亮色' }}
      </n-button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui'
import type { ThemeMode } from '../types'

defineProps<{
  theme: ThemeMode
}>()

defineEmits<{
  'toggle-theme': []
}>()
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--panel);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo {
  font-size: 24px;
}

.title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: var(--text);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-icon {
  margin-right: 4px;
}
</style>
