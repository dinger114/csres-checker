<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useLogStore } from '../stores/log'

const { stats } = storeToRefs(useLogStore())
</script>

<template>
  <div class="log-stats">
    <span><i class="dot dot-g" />OK:{{ stats.ok }}</span>
    <span><i class="dot dot-r" />EMPTY:{{ stats.empty }}</span>
    <span>TIME:{{ stats.time }}s</span>
    <span>Q:{{ stats.queries }}</span>
  </div>
</template>

<style scoped>
.log-stats {
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  font-size: 10px;
  color: var(--text-dim);
  position: relative;
  z-index: 2;
  background: var(--header-bg);
  transition: background 0.3s;
  min-height: 32px;
}

.log-stats span { display: flex; align-items: center; gap: 4px; }
.log-stats .dot { width: 6px; height: 6px; border-radius: 50%; }
</style>
