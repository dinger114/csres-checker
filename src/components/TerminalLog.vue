<template>
  <aside class="log-panel terminal-box">
    <div class="terminal-header">
      <span class="dot dot-red"></span>
      <span class="dot dot-yellow"></span>
      <span class="dot dot-green"></span>
      <span class="terminal-title">TERMINAL</span>
    </div>
    <div class="log-body" ref="logBodyRef">
      <div
        v-for="(line, i) in lines"
        :key="i"
        class="log-line"
        :class="'log-' + line.type"
      >
        <span class="log-time">{{ line.time }}</span>
        <span class="log-msg">{{ line.message }}</span>
      </div>
    </div>
    <LogStats :stats="stats" />
  </aside>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import LogStats from './LogStats.vue'
import { useLog } from '../composables/useLog'

const { lines, stats } = useLog()
const logBodyRef = ref<HTMLElement | null>(null)

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
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.log-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.05) 2px,
    rgba(0, 0, 0, 0.05) 4px
  );
  pointer-events: none;
}

.log-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  min-height: 0;
}

.log-line {
  font-size: 12px;
  line-height: 1.6;
  animation: fadeIn 0.2s ease;
}

.log-time {
  color: var(--text-dim);
  margin-right: 8px;
}

.log-msg {
  color: var(--text);
}

.log-success .log-msg { color: #27c93f; }
.log-warn .log-msg { color: #ffbd2e; }
-log-error .log-msg { color: #ff5f56; }
.log-highlight .log-msg { color: var(--primary); font-weight: 600; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .log-panel {
    width: 100%;
    height: 220px;
  }
}
</style>
