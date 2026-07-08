<template>
  <div class="terminal-box">
    <div class="terminal-header">
      <span class="dot dot-r"></span>
      <span class="dot dot-y"></span>
      <span class="dot dot-g"></span>
      <span class="title">INPUT</span>
    </div>
    <div class="terminal-body">
      <label>// 标准编号（每行一个）<span class="hint">Ctrl+Enter 运行 · Esc 清空 · 支持拖入 .txt</span></label>
      <textarea
        ref="textareaRef"
        v-model="keywords"
        placeholder="GB 50222-2017&#10;50010&#10;GB 50311-2016"
        :disabled="running"
        @keydown="handleKeydown"
        @drop.prevent="handleDrop"
        @dragover.prevent
      ></textarea>
      <div class="btn-row">
        <button :disabled="running" @click="handleRun">[ RUN ]</button>
        <label class="upload-btn" :class="{ disabled: running }">
          [ IMPORT TXT ]
          <input type="file" accept=".txt" @change="handleFileUpload" hidden :disabled="running" />
        </label>
        <button :disabled="running || !hasResults" @click="emit('copy-md')">[ COPY MD ]</button>
        <button :disabled="running || !hasResults" @click="emit('export-xlsx')">[ EXPORT XLSX ]</button>
      </div>
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
import { ref } from 'vue'
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

function handleRun() {
  const lines = parseKeywords(keywords.value)
  if (lines.length === 0) return
  emit('run', lines)
}

function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    handleRun()
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    keywords.value = ''
    textareaRef.value?.focus()
  }
}

function parseKeywords(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean)
}

function handleFileUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  readFile(file)
  input.value = ''
}

function handleDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (!file || !file.name.endsWith('.txt')) return
  readFile(file)
}

function readFile(file: File) {
  const reader = new FileReader()
  reader.onload = () => {
    const text = reader.result as string
    const lines = parseKeywords(text)
    if (lines.length > 0) {
      const existing = keywords.value.trim()
      keywords.value = existing ? existing + '\n' + lines.join('\n') : lines.join('\n')
    }
  }
  reader.readAsText(file)
}

function setText(text: string) {
  keywords.value = text
  textareaRef.value?.focus()
}

defineExpose({ setText })
</script>

<style scoped>
.hint {
  color: var(--text-secondary);
  font-size: 11px;
  margin-left: 8px;
}

.upload-btn {
  display: inline-block;
  cursor: pointer;
  opacity: 1;
  transition: opacity 0.15s;
}

.upload-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
