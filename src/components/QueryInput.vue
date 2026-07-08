<template>
  <div class="terminal-box">
    <div class="terminal-header">
      <span class="dot dot-r"></span>
      <span class="dot dot-y"></span>
      <span class="dot dot-g"></span>
      <span class="title">INPUT</span>
    </div>
    <div class="terminal-body">
      <label>// 标准编号（每行一个）</label>
      <textarea
        ref="textareaRef"
        v-model="keywords"
        placeholder="GB 50222-2017&#10;50010&#10;GB 50311-2016"
        :disabled="running"
      ></textarea>
      <div class="btn-row">
        <button :disabled="running" @click="handleRun">[ RUN ]</button>
        <button :disabled="running || !hasResults" @click="emit('copy-md')">[ COPY MD ]</button>
        <button :disabled="running || !hasResults" @click="emit('export-xlsx')">[ EXPORT XLSX ]</button>
      </div>
      <div ref="turnstileEl" id="turnstileWidget"></div>
      <div v-if="progress.pct > 0" class="progress-wrap">
        <div class="progress-info">
          <span>[{{ progress.current }}/{{ progress.total }}]</span>
          <span>{{ progress.pct }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress.pct + '%' }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import type { ProgressState } from '../types'

defineProps<{
  running: boolean
  progress: ProgressState
  hasResults: boolean
}>()

const emit = defineEmits<{
  run: [keywords: string[]]
  'copy-md': []
  'export-xlsx': []
}>()

const keywords = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const turnstileEl = ref<HTMLElement | null>(null)

function handleRun() {
  const lines = keywords.value.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return
  emit('run', lines)
}

function emitTurnstileMount() {
  if (turnstileEl.value) {
    window.dispatchEvent(new CustomEvent('turnstile-mount', { detail: turnstileEl.value }))
  }
}

onMounted(() => {
  nextTick(emitTurnstileMount)
})

watch(turnstileEl, (el) => {
  if (el) emitTurnstileMount()
})
</script>
