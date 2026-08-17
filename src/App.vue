<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import AppHeader from './components/AppHeader.vue'
import DonatePanel from './components/DonatePanel.vue'
import HelpPanel from './components/HelpPanel.vue'
import QueryInput from './components/QueryInput.vue'
import ResultsTable from './components/ResultsTable.vue'
import TerminalLog from './components/TerminalLog.vue'
import Toast from './components/Toast.vue'
import VersionHistory from './components/VersionHistory.vue'
import { useFirebase } from './composables/useFirebase'
import { useHistoryStore } from './stores/history'
import { useLogStore } from './stores/log'
import { useQueryStore } from './stores/query'
import { useThemeStore } from './stores/theme'
import { useUIStore } from './stores/ui'

const queryStore = useQueryStore()
const uiStore = useUIStore()
const themeStore = useThemeStore()
const historyStore = useHistoryStore()
const logStore = useLogStore()

const { results, progress, running } = storeToRefs(queryStore)
const { mobileActiveTab, mobileTabs, showVersionHistory, selectedVersions, showHelp } = storeToRefs(uiStore)
const { theme } = storeToRefs(themeStore)
const { history } = storeToRefs(historyStore)
const { lines: logLines } = storeToRefs(logStore)

const firebase = useFirebase()

const queryInputRef = ref<InstanceType<typeof QueryInput> | null>(null)
const terminalCount = computed(() => logLines.value.length)
const isMobile = useMediaQuery('(max-width: 768px)')

function handleRun(keywords: string[], source: string = '', mode: string = 'number') {
  logStore.add(`RUN: 收到 ${keywords.length} 个关键词`, 'info')
  historyStore.add(keywords)
  // On mobile, switch to output tab when query starts
  if (isMobile.value)
    uiStore.switchTab('output')
  if (mode === 'name')
    queryStore.searchByName(keywords, source)
  else if (mode === 'atlas')
    queryStore.queryAtlas(keywords)
  else
    queryStore.query(keywords, source)
}

function handleHistoryLoad(entry: string) {
  queryInputRef.value?.setText(entry)
  // On mobile, switch to input tab when loading history
  if (isMobile.value)
    uiStore.switchTab('input')
}

onMounted(() => {
  themeStore.initTheme()
  firebase.init()
  firebase.refreshCount()
})
</script>

<template>
  <div class="app" :class="{ 'theme-dark': theme === 'dark', 'theme-light': theme === 'light' }">
    <!-- Mobile tab bar (always visible) -->
    <div class="mobile-tabs" role="tablist" aria-label="面板切换">
      <button
        v-for="tab in mobileTabs"
        :key="tab.key"
        class="mobile-tab"
        role="tab"
        :aria-selected="mobileActiveTab === tab.key"
        :class="{ active: mobileActiveTab === tab.key }"
        @click="uiStore.switchTab(tab.key)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
        <span v-if="tab.key === 'output' && results.length > 0" class="tab-badge">{{ results.length }}</span>
        <span v-if="tab.key === 'terminal' && terminalCount > 0" class="tab-badge">{{ terminalCount }}</span>
      </button>
    </div>
    <main class="main-panel">
      <AppHeader :theme="theme" @toggle-theme="themeStore.toggleTheme" @show-help="uiStore.openHelp" />
      <!-- Desktop: show all; Mobile: show only active -->
      <div class="panel-input" :class="{ 'mobile-hidden': mobileActiveTab !== 'input' }">
        <QueryInput
          ref="queryInputRef"
          :running="running"
          :progress="progress"
          :has-results="results.length > 0"
          @run="handleRun"
          @copy-md="queryStore.copyMarkdown"
          @export-xlsx="queryStore.exportExcel"
        />
      </div>
      <div class="panel-output" :class="{ 'mobile-hidden': mobileActiveTab !== 'output' }">
        <ResultsTable
          :results="results"
          :loading="running"
          @update:columns="uiStore.setColumns"
          @show-versions="uiStore.openVersions"
        />
      </div>
    </main>
    <!-- Desktop: sidebar; Mobile: full panel when terminal tab active -->
    <div class="terminal-wrapper" :class="{ 'mobile-hidden': mobileActiveTab !== 'terminal' }">
      <div class="mobile-back-btn">
        <button @click="uiStore.switchTab('output')">
          &larr; 返回
        </button>
      </div>
      <TerminalLog
        :history="history"
        @load="handleHistoryLoad"
        @delete="historyStore.remove"
        @clear="historyStore.clear"
      />
    </div>
    <DonatePanel :show-on-input="mobileActiveTab === 'input'" />
    <Toast />
    <VersionHistory
      :visible="showVersionHistory"
      :versions="selectedVersions"
      @close="uiStore.closeVersions"
    />
    <HelpPanel
      :visible="showHelp"
      @close="uiStore.closeHelp"
    />
  </div>
</template>
