<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <div class="app" :class="{ 'theme-dark': theme === 'dark', 'theme-light': theme === 'light' }">
        <!-- Mobile tab bar (always visible) -->
        <div class="mobile-tabs">
          <button
            v-for="tab in mobileTabs"
            :key="tab.key"
            class="mobile-tab"
            :class="{ active: mobileActiveTab === tab.key }"
            @click="mobileActiveTab = tab.key"
          >
            <span class="tab-icon">{{ tab.icon }}</span>
            <span class="tab-label">{{ tab.label }}</span>
            <span v-if="tab.key === 'output' && results.length > 0" class="tab-badge">{{ results.length }}</span>
            <span v-if="tab.key === 'terminal' && terminalCount > 0" class="tab-badge">{{ terminalCount }}</span>
          </button>
        </div>
        <main class="main-panel">
          <AppHeader :theme="theme" @toggle-theme="toggleTheme" @show-help="showHelp = true" />
          <!-- Desktop: show all; Mobile: show only active -->
          <div class="panel-input" :class="{ 'mobile-hidden': mobileActiveTab !== 'input' }">
            <QueryInput
              ref="queryInputRef"
              :running="running"
              :progress="progress"
              :hasResults="results.length > 0"
              @run="handleRun"
              @copy-md="handleCopyMd"
              @export-xlsx="handleExportXlsx"
            />
          </div>
          <div class="panel-output" :class="{ 'mobile-hidden': mobileActiveTab !== 'output' }">
            <ResultsTable
              ref="resultsTableRef"
              :results="results"
              @update:columns="handleColumnsUpdate"
              @show-versions="handleShowVersions"
            />
          </div>
        </main>
        <!-- Desktop: sidebar; Mobile: full panel when terminal tab active -->
        <div class="terminal-wrapper" :class="{ 'mobile-hidden': mobileActiveTab !== 'terminal' }">
          <div class="mobile-back-btn">
            <button @click="mobileActiveTab = 'output'">&larr; 返回</button>
          </div>
          <TerminalLog
            :history="history"
            @load="handleHistoryLoad"
            @delete="handleHistoryDelete"
            @clear="handleHistoryClear"
          />
        </div>
        <DonatePanel />
        <Toast />
        <VersionHistory
          :visible="showVersionHistory"
          :versions="selectedVersions"
          @close="handleCloseVersions"
        />
        <HelpPanel
          :visible="showHelp"
          @close="showHelp = false"
        />
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NConfigProvider, NMessageProvider, darkTheme, lightTheme } from 'naive-ui'
import AppHeader from './components/AppHeader.vue'
import QueryInput from './components/QueryInput.vue'
import ResultsTable from './components/ResultsTable.vue'
import type { ColumnDef } from './components/ResultsTable.vue'
import TerminalLog from './components/TerminalLog.vue'
import VersionHistory from './components/VersionHistory.vue'
import HelpPanel from './components/HelpPanel.vue'
import DonatePanel from './components/DonatePanel.vue'
import Toast from './components/Toast.vue'
import { useTheme } from './composables/useTheme'
import { useQuery } from './composables/useQuery'
import { useClipboard } from './composables/useClipboard'
import { useToast } from './composables/useToast'
import { useFirebase } from './composables/useFirebase'
import { useLog } from './composables/useLog'
import { useXlsx } from './composables/useXlsx'
import { useHistory } from './composables/useHistory'
import type { StandardVersion } from './types'

const { theme, toggleTheme, initTheme } = useTheme()
const { results, progress, running, query, searchByName } = useQuery()
const { exportMarkdown, copy } = useClipboard()
const { exportXlsx } = useXlsx()
const toast = useToast()
const firebase = useFirebase()
const { add: logAdd } = useLog()
const { history, add: addHistory, remove: removeHistory, clear: clearHistory } = useHistory()

const queryInputRef = ref<InstanceType<typeof QueryInput> | null>(null)
const resultsTableRef = ref<InstanceType<typeof ResultsTable> | null>(null)
const currentColumns = ref<ColumnDef[]>([])
const showVersionHistory = ref(false)
const selectedVersions = ref<StandardVersion[]>([])
const showHelp = ref(false)

// Mobile panel switching
const mobileActiveTab = ref('input')
const mobileTabs = [
  { key: 'input', label: 'INPUT', icon: '$' },
  { key: 'output', label: 'OUTPUT', icon: '>' },
  { key: 'terminal', label: 'LOG', icon: '#' },
]
const { lines: logLines } = useLog()
const terminalCount = computed(() => logLines.value.length)

const naiveTheme = computed(() => (theme.value === 'dark' ? darkTheme : lightTheme))

const themeOverrides = computed(() => ({
  common: {
    primaryColor: theme.value === 'dark' ? '#00ff41' : '#0d47a1',
    primaryColorHover: theme.value === 'dark' ? '#00cc33' : '#1565c0',
    primaryColorPressed: theme.value === 'dark' ? '#009922' : '#0a3d8f',
  },
}))

function handleRun(keywords: string[], source: string = '', mode: string = 'number') {
  logAdd(`RUN: 收到 ${keywords.length} 个关键词`, 'info')
  addHistory(keywords)
  // On mobile, switch to output tab when query starts
  if (window.innerWidth <= 768) {
    mobileActiveTab.value = 'output'
  }
  if (mode === 'name') {
    searchByName(keywords, source)
  } else {
    query(keywords, source)
  }
}

function handleColumnsUpdate(columns: ColumnDef[]) {
  currentColumns.value = columns
}

async function handleCopyMd() {
  const md = exportMarkdown(results.value as any, currentColumns.value)
  if (!md) {
    toast.show('暂无结果可复制')
    return
  }
  const ok = await copy(md)
  toast.show(ok ? '已复制 Markdown 到剪贴板' : '复制失败')
}

function handleExportXlsx() {
  if (results.value.length === 0) {
    toast.show('暂无结果可导出')
    return
  }
  exportXlsx(results.value as any, currentColumns.value)
  toast.show('已导出 Excel 文件')
}

function handleHistoryLoad(entry: string) {
  queryInputRef.value?.setText(entry)
  // On mobile, switch to input tab when loading history
  if (window.innerWidth <= 768) {
    mobileActiveTab.value = 'input'
  }
}

function handleHistoryDelete(index: number) {
  removeHistory(index)
}

function handleHistoryClear() {
  clearHistory()
}

function handleShowVersions(versions: StandardVersion[]) {
  selectedVersions.value = versions
  showVersionHistory.value = true
}

function handleCloseVersions() {
  showVersionHistory.value = false
  selectedVersions.value = []
}

onMounted(() => {
  initTheme()
  firebase.init()
  firebase.refreshCount()
})
</script>

<style scoped>
.app {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.main-panel {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.terminal-wrapper {
  flex-shrink: 0;
}

/* Mobile tab bar */
.mobile-tabs {
  display: none;
}

.mobile-back-btn {
  display: none;
}

@media (max-width: 768px) {
  .app {
    flex-direction: column;
  }

  .mobile-tabs {
    display: flex;
    gap: 0;
    background: var(--header-bg);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    position: sticky;
    top: 0;
    z-index: 30;
  }

  .mobile-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 8px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-dim);
    font-size: 11px;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    min-height: 44px;
  }

  .mobile-tab:hover {
    color: var(--primary);
    background: var(--hover-bg);
  }

  .mobile-tab.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
    background: var(--hover-bg);
  }

  .tab-icon {
    font-size: 13px;
    font-weight: 700;
  }

  .tab-badge {
    font-size: 9px;
    background: var(--primary);
    color: var(--bg);
    padding: 1px 5px;
    border-radius: 8px;
    min-width: 16px;
    text-align: center;
    line-height: 14px;
  }

  .main-panel {
    padding: 0;
    overflow-y: hidden;
    flex: 1;
    min-height: 0;
  }

  .panel-input,
  .panel-output {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .mobile-hidden {
    display: none !important;
  }

  .mobile-back-btn {
    display: block;
    background: var(--header-bg);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .mobile-back-btn button {
    width: 100%;
    padding: 10px 12px;
    background: none;
    border: none;
    color: var(--primary);
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    min-height: 44px;
  }

  .mobile-back-btn button:hover {
    background: var(--hover-bg);
  }

  .terminal-wrapper {
    position: fixed;
    top: 44px;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    background: var(--bg);
    display: flex;
    flex-direction: column;
  }

  .terminal-wrapper :deep(.log-panel) {
    flex: 1;
    width: 100%;
    margin: 0;
    border-radius: 0;
    border: none;
    min-height: 0;
  }
}
</style>
