<template>
  <div class="log-stats">
    <span><i class="dot dot-g"></i>OK:{{ stats.ok }}</span>
    <span><i class="dot dot-r"></i>EMPTY:{{ stats.empty }}</span>
    <span>TIME:{{ stats.time }}s</span>
    <span>Q:{{ stats.queries }}</span>
    <span class="cache-info">
      <button class="cache-toggle-btn" :class="{ disabled: !cacheEnabled }" @click="emit('toggle-cache')">
        CACHE:{{ cacheEnabled ? cacheSize : 'OFF' }}
      </button>
      <button v-if="cacheEnabled && cacheSize > 0" class="clear-cache-btn" @click="emit('clear-cache')">CLEAR</button>
    </span>
  </div>
</template>

<script setup lang="ts">
import { useLog } from '../composables/useLog'

defineProps<{
  cacheEnabled: boolean
  cacheSize: number
}>()

const emit = defineEmits<{
  'toggle-cache': []
  'clear-cache': []
}>()

const { stats } = useLog()
</script>

<style scoped>
.cache-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cache-toggle-btn {
  background: none;
  border: 1px solid var(--border-subtle);
  color: var(--text-dim);
  font-size: 8px;
  padding: 1px 4px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.15s;
  font-family: inherit;
}

.cache-toggle-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.cache-toggle-btn.disabled {
  opacity: 0.5;
  border-color: var(--danger);
  color: var(--danger);
}

.clear-cache-btn {
  background: none;
  border: 1px solid var(--border-subtle);
  color: var(--text-dim);
  font-size: 8px;
  padding: 1px 4px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.15s;
  font-family: inherit;
}

.clear-cache-btn:hover {
  border-color: var(--danger);
  color: var(--danger);
}
</style>
