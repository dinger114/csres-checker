<template>
  <div class="title-row">
    <h1>标准查新工具</h1>
    <button class="theme-toggle" @click="$emit('toggle-theme')">
      <span class="icon">{{ theme === 'dark' ? '🌙' : '☀️' }}</span>
      <span>{{ theme === 'dark' ? 'DARK' : 'LIGHT' }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ThemeMode } from '../types'

defineProps<{
  theme: ThemeMode
}>()

defineEmits<{
  'toggle-theme': []
}>()
</script>
