<template>
  <div class="log-stats">
    <span><i class="stat-dot stat-ok"></i>OK: {{ stats.ok }}</span>
    <span><i class="stat-dot stat-empty"></i>EMPTY: {{ stats.empty }}</span>
    <span>TIME: {{ stats.time }}s</span>
    <span>Q: {{ stats.queries }}</span>
    <span class="global-count">TOTAL: {{ globalCount }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLog } from '../composables/useLog'
import { useFirebase } from '../composables/useFirebase'

const { stats } = useLog()
const { globalCount } = useFirebase()
</script>

<style scoped>
.log-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--text-dim);
}

.stat-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}

.stat-ok { background: #27c93f; }
.stat-empty { background: #ff5f56; }

.global-count {
  margin-left: auto;
  color: var(--primary);
  font-weight: 600;
}
</style>
