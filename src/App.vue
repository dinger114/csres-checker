<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <div class="app" :class="{ 'theme-dark': theme === 'dark', 'theme-light': theme === 'light' }">
        <div class="main-panel">
          <AppHeader :theme="theme" @toggle-theme="toggleTheme" />
          <QueryInput
            ref="queryInputRef"
            :running="running"
            :progress="progress"
            :hasResults="results.length > 0"
            @run="handleRun"
            @copy-md="handleCopyMd"
            @export-xlsx="handleExportXlsx"
          />
          <ResultsTable
            :results="results"
          />
        </div>
        <TerminalLog
          :history="history"
          @load="handleHistoryLoad"
          @delete="handleHistoryDelete"
          @clear="handleHistoryClear"
        />
        <DonatePanel />
        <Toast />
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
import TerminalLog from './components/TerminalLog.vue'
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

const { theme, toggleTheme, initTheme } = useTheme()
const { results, progress, running, query } = useQuery()
const { exportMarkdown, copy } = useClipboard()
const { exportXlsx } = useXlsx()
const toast = useToast()
const firebase = useFirebase()
const { add: logAdd } = useLog()
const { history, add: addHistory, remove: removeHistory, clear: clearHistory } = useHistory()

const queryInputRef = ref<InstanceType<typeof QueryInput> | null>(null)

const naiveTheme = computed(() => (theme.value === 'dark' ? darkTheme : lightTheme))

const themeOverrides = computed(() => ({
  common: {
    primaryColor: theme.value === 'dark' ? '#00ff41' : '#0d47a1',
    primaryColorHover: theme.value === 'dark' ? '#00cc33' : '#1565c0',
    primaryColorPressed: theme.value === 'dark' ? '#009922' : '#0a3d8f',
  },
}))

function handleRun(keywords: string[]) {
  logAdd(`RUN: 收到 ${keywords.length} 个关键词`, 'info')
  addHistory(keywords)
  query(keywords)
}

async function handleCopyMd() {
  const md = exportMarkdown(results.value as any)
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
  exportXlsx(results.value as any)
  toast.show('已导出 Excel 文件')
}

function handleHistoryLoad(entry: string) {
  queryInputRef.value?.setText(entry)
}

function handleHistoryDelete(index: number) {
  removeHistory(index)
}

function handleHistoryClear() {
  clearHistory()
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
</style>
