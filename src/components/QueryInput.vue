<template>
  <div class="query-input terminal-box">
    <div class="terminal-header">
      <span class="dot dot-red"></span>
      <span class="dot dot-yellow"></span>
      <span class="dot dot-green"></span>
      <span class="terminal-title">INPUT</span>
    </div>
    <div class="terminal-body">
      <label class="input-label">// 标准编号（每行一个）</label>
      <n-input
        v-model:value="keywords"
        type="textarea"
        :rows="5"
        placeholder="GB 50222-2017&#10;50010&#10;GB 50311-2016"
        :disabled="running"
      />
      <div class="btn-row">
        <n-button type="primary" :loading="running" @click="handleRun">
          {{ running ? '查询中...' : 'RUN' }}
        </n-button>
        <n-button :disabled="running" @click="emit('copy-md')">
          COPY MD
        </n-button>
      </div>
      <div ref="turnstileEl" class="turnstile-widget"></div>
      <ProgressBar :progress="progress" :running="running" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NInput, NButton } from 'naive-ui'
import ProgressBar from './ProgressBar.vue'
import type { ProgressState } from '../types'

defineProps<{
  running: boolean
  progress: ProgressState
}>()

const emit = defineEmits<{
  run: [keywords: string[]]
  'copy-md': []
}>()

const keywords = ref('')
const turnstileEl = ref<HTMLElement | null>(null)

function handleRun() {
  const lines = keywords.value.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return
  emit('run', lines)
}

onMounted(() => {
  if (turnstileEl.value) {
    window.dispatchEvent(new CustomEvent('turnstile-mount', { detail: turnstileEl.value }))
  }
})
</script>

<style scoped>
.query-input {
  flex-shrink: 0;
}

.terminal-box {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--panel);
  overflow: hidden;
}

.terminal-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot-red { background: #ff5f56; }
.dot-yellow { background: #ffbd2e; }
.dot-green { background: #27c93f; }

.terminal-title {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
  letter-spacing: 1px;
}

.terminal-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-label {
  font-size: 12px;
  color: var(--text-dim);
}

.btn-row {
  display: flex;
  gap: 8px;
}

.turnstile-widget {
  margin-top: 4px;
}
</style>
