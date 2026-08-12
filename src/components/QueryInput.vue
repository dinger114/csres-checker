<script setup lang="ts">
import type { ProgressState } from '../types'
import { onMounted, ref } from 'vue'

defineProps<{
  running: boolean
  progress: ProgressState
  hasResults: boolean
}>()

const emit = defineEmits<{
  'run': [keywords: string[], source: string, mode: string]
  'copy-md': []
  'export-xlsx': []
}>()

const sources = [
  { key: 'cssn', label: 'CSSN' },
  { key: 'bzsou', label: '标准搜' },
  { key: 'gongbiaoku', label: '工标库' },
  { key: 'csres', label: 'CSRes' },
  { key: 'cqdb', label: '重庆地标' },
]

const keywords = ref('')
const selectedSource = ref('')
const searchMode = ref('number')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const nameInputRef = ref<HTMLInputElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

function handleRun() {
  const lines = parseKeywords(keywords.value)
  if (lines.length === 0)
    return
  emit('run', lines, selectedSource.value, searchMode.value)
}

function handleModeChange() {
  // Clear keywords when switching modes
  keywords.value = ''
}

function triggerUpload() {
  fileInputRef.value?.click()
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
    nameInputRef.value?.focus()
  }
}

function parseKeywords(text: string): string[] {
  return text.split('\n').map(l => l.trim()).filter(Boolean)
}

function handleFileUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return
  readFile(file)
  input.value = ''
}

function handleDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (!file || !file.name.endsWith('.txt'))
    return
  readFile(file)
}

function readFile(file: File) {
  const reader = new FileReader()
  reader.onload = () => {
    const text = reader.result as string
    const lines = parseKeywords(text)
    if (lines.length > 0) {
      const existing = keywords.value.trim()
      keywords.value = existing ? `${existing}\n${lines.join('\n')}` : lines.join('\n')
    }
  }
  reader.readAsText(file)
}

function handleShare() {
  const lines = parseKeywords(keywords.value)
  if (lines.length === 0)
    return
  const params = new URLSearchParams()
  params.set('q', lines.join(','))
  params.set('mode', searchMode.value)
  if (searchMode.value === 'number' && selectedSource.value) {
    params.set('source', selectedSource.value)
  }
  const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`
  navigator.clipboard.writeText(url).then(() => {
    window.history.replaceState({}, '', `?${params.toString()}`)
  })
}

function setText(text: string) {
  keywords.value = text
  textareaRef.value?.focus()
  nameInputRef.value?.focus()
}

function loadFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const q = params.get('q')
  if (q) {
    keywords.value = q.split(',').join('\n')
    const mode = params.get('mode')
    if (mode === 'number' || mode === 'name') {
      searchMode.value = mode
    }
    const source = params.get('source')
    if (source) {
      selectedSource.value = source
    }
    return params.get('auto') === '1'
  }
  return false
}

onMounted(() => {
  const shouldAutoRun = loadFromUrl()
  if (shouldAutoRun && keywords.value.trim()) {
    handleRun()
  }
})

defineExpose({ setText })
</script>

<template>
  <div class="terminal-box">
    <div class="terminal-header">
      <span class="dot dot-r" />
      <span class="dot dot-y" />
      <span class="dot dot-g" />
      <span class="title">INPUT</span>
    </div>
    <div class="terminal-body">
      <label>// {{ searchMode === 'number' ? '标准编号（每行一个）' : '标准名称关键词' }}<span v-if="searchMode === 'number'" class="hint">Ctrl+Enter 运行 · Esc 清空 · 支持拖入 .txt</span><span v-else class="hint">Ctrl+Enter 运行 · Esc 清空</span></label>
      <textarea
        v-if="searchMode === 'number'"
        ref="textareaRef"
        v-model="keywords"
        inputmode="text"
        spellcheck="false"
        placeholder="GB 50222-2017&#10;50010&#10;GB 50311-2016"
        :disabled="running"
        @keydown="handleKeydown"
        @drop.prevent="handleDrop"
        @dragover.prevent
      />
      <input
        v-else
        ref="nameInputRef"
        v-model="keywords"
        type="text"
        placeholder="搜索标准名称关键词，例如：消防"
        :disabled="running"
        @keydown="handleKeydown"
      >
      <div class="mode-tabs">
        <label class="mode-tab" :class="{ active: searchMode === 'number' }">
          <input v-model="searchMode" type="radio" value="number" :disabled="running" @change="handleModeChange">
          <span># 编号查询</span>
        </label>
        <label class="mode-tab" :class="{ active: searchMode === 'name' }">
          <input v-model="searchMode" type="radio" value="name" :disabled="running" @change="handleModeChange">
          <span>$ 名称检索</span>
        </label>
      </div>
      <div v-if="searchMode === 'number'" class="source-row">
        <span class="source-label">数据源:</span>
        <label class="source-check">
          <input v-model="selectedSource" type="radio" value="" :disabled="running">
          <span>默认</span>
        </label>
        <label v-for="src in sources" :key="src.key" class="source-check">
          <input v-model="selectedSource" type="radio" :value="src.key" :disabled="running">
          <span>{{ src.label }}</span>
        </label>
      </div>
      <div class="btn-row">
        <button class="btn-run" :disabled="running" @click="handleRun">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          <span class="btn-text">RUN</span>
        </button>
        <button v-if="searchMode === 'number'" :disabled="running" title="导入 TXT 文件" @click="triggerUpload">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
          <span class="btn-text">IMPORT</span>
        </button>
        <input v-if="searchMode === 'number'" ref="fileInputRef" type="file" accept=".txt" hidden @change="handleFileUpload">
        <button :disabled="running || !hasResults" title="复制 Markdown" @click="emit('copy-md')">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
          <span class="btn-text">MD</span>
        </button>
        <button :disabled="running || !hasResults" title="导出 Excel" @click="emit('export-xlsx')">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
          <span class="btn-text">XLSX</span>
        </button>
        <button :disabled="running || !keywords.trim()" title="分享链接" @click="handleShare">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
          <span class="btn-text">SHARE</span>
        </button>
      </div>
      <div v-if="progress.pct > 0" class="progress-wrap">
        <div class="progress-info">
          <span>[{{ progress.current }}/{{ progress.total }}]</span>
          <span>{{ progress.pct }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress.pct}%` }" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hint {
  color: var(--text-secondary);
  font-size: 11px;
  margin-left: 8px;
}

.mode-tabs {
  display: flex;
  gap: 6px;
  margin: 10px 0 12px;
}

.mode-tab {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 5px 12px;
  font-size: 11px;
  color: var(--text-secondary);
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.15s;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  user-select: none;
  font-family: var(--font-mono);
  font-weight: 600;
}

.mode-tab:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.mode-tab.active {
  color: var(--primary);
  border-color: var(--border);
}

.mode-tab input { display: none; }

.source-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 0;
  padding: 8px 0 4px;
  flex-wrap: wrap;
}

.source-label {
  font-size: 11px;
  color: var(--text-dim);
  flex-shrink: 0;
}

.source-check {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-dim);
  cursor: pointer;
  white-space: nowrap;
}

.source-check input[type="checkbox"] {
  width: 12px;
  height: 12px;
  accent-color: var(--primary);
  cursor: pointer;
}

.source-check:hover {
  color: var(--primary);
}

.source-hint {
  font-size: 10px;
  color: var(--text-secondary);
  font-style: italic;
}

.icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.btn-run {
  background: var(--primary) !important;
  color: var(--bg) !important;
  border-color: var(--primary) !important;
}

.btn-run:hover {
  opacity: 0.9;
}

/* Mobile: show only icons, hide text */
@media (max-width: 640px) {
  .btn-text {
    display: none;
  }

  .btn-row button {
    padding: 8px;
    min-width: 44px;
    justify-content: center;
  }

  .hint {
    display: none;
  }

  .source-row {
    gap: 8px;
  }

  .source-label {
    display: none;
  }

  .source-hint {
    display: none;
  }
}

@media (max-width: 375px) {
  .btn-row { gap: 4px; }
  .btn-row button { min-width: 40px; padding: 6px; }
}
</style>
