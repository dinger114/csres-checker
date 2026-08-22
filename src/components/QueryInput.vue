<script setup lang="ts">
import type { ProgressState } from '../types'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ActionBar from './ActionBar.vue'
import SourceSelector from './SourceSelector.vue'

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

const { t } = useI18n()

const numberSources = [
  { key: 'cssn', label: 'CSSN' },
  { key: 'bzsou', label: '标准搜' },
  { key: 'ccsn', label: '工程标' },
  { key: 'gongbiaoku', label: '工标库' },
  { key: 'csres', label: 'CSRes' },
  { key: 'cqdb', label: '重庆地标' },
]
const nameSources = [
  { key: 'cssn', label: 'CSSN' },
  { key: 'cqdb', label: '重庆地标' },
]

const keywords = ref('')
const selectedSource = ref('')
const searchMode = ref('number')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const nameInputRef = ref<HTMLInputElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const sources = computed(() => searchMode.value === 'name' ? nameSources : numberSources)

const textareaPlaceholder = computed(() =>
  searchMode.value === 'atlas'
    ? '05SJ810\n24D303-4\n消防'
    : 'GB 50222-2017\n50010\nGB 50311-2016',
)

const showImport = computed(() => searchMode.value === 'number' || searchMode.value === 'atlas')
const hasKeywords = computed(() => keywords.value.trim().length > 0)

function handleRun() {
  const lines = parseKeywords(keywords.value)
  if (lines.length === 0)
    return
  emit('run', lines, selectedSource.value, searchMode.value)
}

function handleModeChange() {
  keywords.value = ''
  selectedSource.value = ''
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
  if ((searchMode.value === 'number' || searchMode.value === 'name') && selectedSource.value) {
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
    if (mode === 'number' || mode === 'name' || mode === 'atlas') {
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
      <span class="title">{{ t('input.title') }}</span>
    </div>
    <div class="terminal-body">
      <label>// {{ searchMode === 'number' ? t('input.label_number') : searchMode === 'atlas' ? t('input.label_atlas') : t('input.label_name') }}<span v-if="searchMode === 'number'" class="hint">{{ t('input.hint_number') }}</span><span v-else class="hint">{{ t('input.hint_other') }}</span></label>
      <textarea
        v-if="searchMode === 'number' || searchMode === 'atlas'"
        ref="textareaRef"
        v-model="keywords"
        inputmode="text"
        spellcheck="false"
        :placeholder="textareaPlaceholder"
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
        :placeholder="t('input.placeholder_name')"
        :disabled="running"
        @keydown="handleKeydown"
      >
      <div class="mode-tabs">
        <label class="mode-tab" :class="{ active: searchMode === 'number' }">
          <input v-model="searchMode" type="radio" value="number" :disabled="running" @change="handleModeChange">
          <span>{{ t('input.mode_number') }}</span>
        </label>
        <label class="mode-tab" :class="{ active: searchMode === 'name' }">
          <input v-model="searchMode" type="radio" value="name" :disabled="running" @change="handleModeChange">
          <span>{{ t('input.mode_name') }}</span>
        </label>
        <label class="mode-tab" :class="{ active: searchMode === 'atlas' }">
          <input v-model="searchMode" type="radio" value="atlas" :disabled="running" @change="handleModeChange">
          <span>{{ t('input.mode_atlas') }}</span>
        </label>
      </div>
      <SourceSelector
        v-if="searchMode === 'number' || searchMode === 'name'"
        v-model="selectedSource"
        :sources="sources"
        :disabled="running"
      />
      <ActionBar
        :running="running"
        :has-results="hasResults"
        :has-keywords="hasKeywords"
        :show-import="showImport"
        @run="handleRun"
        @import="triggerUpload"
        @copy-md="emit('copy-md')"
        @export-xlsx="emit('export-xlsx')"
        @share="handleShare"
      />
      <input v-if="showImport" ref="fileInputRef" type="file" accept=".txt" hidden @change="handleFileUpload">
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

@media (max-width: 640px) {
  .hint {
    display: none;
  }
}
</style>
