<template>
  <div class="log-stats">
    <span><i class="dot dot-g"></i>OK:{{ stats.ok }}</span>
    <span><i class="dot dot-r"></i>EMPTY:{{ stats.empty }}</span>
    <span>TIME:{{ stats.time }}s</span>
    <span>Q:{{ stats.queries }}</span>
    <span class="cache-info">
      CACHE:{{ cacheSize }}
      <button v-if="cacheSize > 0" class="clear-cache-btn" @click="handleClearCache">CLEAR</button>
    </span>
    <span style="margin-left:auto;color:var(--primary);font-weight:600;">TOTAL:{{ globalCount }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useLog } from '../composables/useLog'
import { useFirebase } from '../composables/useFirebase'
import { useCache } from '../composables/useCache'

const { stats } = useLog()
const { globalCount } = useFirebase()
const { size, clear } = useCache()

const cacheSize = ref(size())

function handleClearCache() {
  clear()
  cacheSize.value = 0
}
</script>

<style scoped>
.cache-info {
  display: flex;
  align-items: center;
  gap: 4px;
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
