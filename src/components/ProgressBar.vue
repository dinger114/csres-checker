<template>
  <div class="progress-wrap" v-if="running || progress.pct > 0">
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: progress.pct + '%' }"></div>
    </div>
    <div class="progress-text">
      <span>{{ progress.current }}/{{ progress.total }}</span>
      <span class="progress-pct">{{ progress.pct }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProgressState } from '../types'

defineProps<{
  progress: ProgressState
  running: boolean
}>()
</script>

<style scoped>
.progress-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-text {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--text-dim);
  white-space: nowrap;
}

.progress-pct {
  font-weight: 600;
  color: var(--primary);
}
</style>
