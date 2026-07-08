<template>
  <div v-if="history.length > 0" class="terminal-box history-box">
    <div class="terminal-header">
      <span class="dot dot-r"></span>
      <span class="dot dot-y"></span>
      <span class="dot dot-g"></span>
      <span class="title">HISTORY</span>
      <button class="clear-btn" @click="emit('clear')">CLEAR</button>
    </div>
    <div class="terminal-body history-body">
      <div
        v-for="(item, i) in history"
        :key="i"
        class="history-item"
        @click="emit('load', item)"
      >
        <span class="history-text">{{ item.split('\n')[0] }}{{ item.split('\n').length > 1 ? '...' : '' }}</span>
        <button class="delete-btn" @click.stop="emit('delete', i)">×</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  history: string[]
}>()

const emit = defineEmits<{
  load: [entry: string]
  delete: [index: number]
  clear: []
}>()
</script>

<style scoped>
.history-box {
  max-height: 200px;
}

.history-body {
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}

.history-item:hover {
  background: var(--hover-bg);
}

.history-text {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.clear-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 10px;
  padding: 2px 6px;
}

.clear-btn:hover {
  color: var(--danger);
}

.delete-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
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
