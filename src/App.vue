<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <div class="app" :class="{ 'theme-dark': theme === 'dark', 'theme-light': theme === 'light' }">
        <div class="main-panel">
          <AppHeader :theme="theme" @toggle-theme="toggleTheme" />
          <QueryInput
            :running="running"
            :progress="progress"
            @run="handleRun"
          />
          <ResultsTable
            :results="results"
            @copy-md="handleCopyMd"
          />
        </div>
        <TerminalLog />
        <DonatePanel />
        <Toast />
        <div ref="turnstileContainer" class="turnstile-container"></div>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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
import { useTurnstile } from './composables/useTurnstile'

const { theme, toggleTheme, initTheme } = useTheme()
const { results, progress, running, query } = useQuery()
const { exportMarkdown, copy } = useClipboard()
const toast = useToast()
const firebase = useFirebase()
const turnstile = useTurnstile()

const naiveTheme = computed(() => (theme.value === 'dark' ? darkTheme : lightTheme))

const themeOverrides = computed(() => ({
  common: {
    primaryColor: theme.value === 'dark' ? '#00ff41' : '#0d47a1',
    primaryColorHover: theme.value === 'dark' ? '#00cc33' : '#1565c0',
    primaryColorPressed: theme.value === 'dark' ? '#009922' : '#0a3d8f',
  },
}))

async function handleRun(keywords: string[]) {
  if (turnstile.enabled) {
    await turnstile.execute()
  }
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

const turnstileContainer = ref<HTMLElement | null>(null)

onMounted(() => {
  initTheme()
  firebase.init()
  firebase.refreshCount()
  turnstile.init(turnstileContainer.value)
})
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: row;
  height: 100vh;
  overflow: hidden;
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', monospace;
}



.main-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  overflow-y: auto;
  min-width: 0;
  height: 100%;
}

.terminal-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border);
}

.terminal-box {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--panel);
  overflow: hidden;
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

.turnstile-container {
  position: absolute;
  bottom: 0;
  right: 320px;
  width: 300px;
  height: 68px;
  overflow: hidden;
  z-index: 100;
  border: 1px dashed var(--border);
  border-radius: 4px;
  background: var(--panel);
  padding: 4px;
}

@media (max-width: 768px) {
  .app {
    flex-direction: column;
    overflow-y: auto;
  }

  .main-panel {
    overflow-y: visible;
  }
}
</style>
