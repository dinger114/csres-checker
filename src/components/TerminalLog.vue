<template>
  <aside class="log-panel" @click="handlePanelClick">
    <div class="log-header">
      <span class="dot dot-r"></span>
      <span class="dot dot-y"></span>
      <span class="dot dot-g"></span>
      <span class="title">TERMINAL</span>
      <button
        v-if="history.length > 0"
        class="tab-btn"
        :class="{ active: showHistory }"
        @click.stop="showHistory = !showHistory"
      >HIST</button>
    </div>

    <div v-if="showHistory && history.length > 0" class="history-section">
      <div class="history-header">
        <span class="history-label">最近查询</span>
        <button class="clear-btn" @click.stop="emit('clear')">清空</button>
      </div>
      <div class="history-list">
        <div
          v-for="(item, i) in history"
          :key="i"
          class="history-item"
          @click.stop="emit('load', item)"
        >
          <span class="history-text">{{ item.split('\n')[0] }}{{ item.split('\n').length > 1 ? '...' : '' }}</span>
          <button class="delete-btn" @click.stop="emit('delete', i)">×</button>
        </div>
      </div>
    </div>

    <div class="log-body" ref="logBodyRef">
      <div
        v-for="(line, i) in lines"
        :key="i"
        class="log-line"
      >
        <span class="log-time">{{ line.time }}</span>
        <span class="log-msg" :class="line.type">{{ line.message }}</span>
      </div>
    </div>
    <LogStats />
  </aside>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import LogStats from './LogStats.vue'
import { useLog } from '../composables/useLog'

defineProps<{
  history: string[]
}>()

const emit = defineEmits<{
  load: [entry: string]
  delete: [number]
  clear: []
}>()

const { lines } = useLog()
const logBodyRef = ref<HTMLElement | null>(null)
const showHistory = ref(false)

function handlePanelClick() {
  if (showHistory.value) {
    showHistory.value = false
  }
}

watch(
  lines,
  async () => {
    await nextTick()
    if (logBodyRef.value) {
      logBodyRef.value.scrollTop = logBodyRef.value.scrollHeight
    }
  },
  { deep: true }
)
</script>

<style scoped>
.log-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-btn {
  margin-left: auto;
  background: var(--header-bg);
  border: 1px solid var(--border-subtle);
  color: var(--text-dim);
  font-size: 9px;
  padding: 2px 8px;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.15s;
}

.tab-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.tab-btn.active {
  background: var(--primary);
  color: var(--bg);
  border-color: var(--primary);
}

.history-section {
  border-bottom: 1px solid var(--border);
  max-height: 180px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--panel);
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border-subtle);
}

.history-label {
  font-size: 10px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.clear-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 10px;
  padding: 2px 6px;
}

.clear-btn:hover {
  color: var(--danger);
}

.history-list {
  overflow-y: auto;
  background: var(--bg);
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.15s;
}

.history-item:hover {
  background: var(--hover-bg);
}

.history-text {
  font-size: 11px;
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.delete-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.history-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: var(--danger);
}
</style>
