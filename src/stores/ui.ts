import type { ColumnDef } from '../components/ResultsTable.vue'
import type { StandardVersion } from '../types'
import { defineStore } from 'pinia'

export interface MobileTab {
  key: string
  label: string
  icon: string
}

export const useUIStore = defineStore('ui', {
  state: () => ({
    mobileActiveTab: 'input',
    mobileTabs: [
      { key: 'input', label: 'INPUT', icon: '$' },
      { key: 'output', label: 'OUTPUT', icon: '>' },
      { key: 'terminal', label: 'LOG', icon: '#' },
    ] as MobileTab[],
    showVersionHistory: false,
    selectedVersions: [] as StandardVersion[],
    showHelp: false,
    currentColumns: [] as ColumnDef[],
  }),
  actions: {
    switchTab(tab: string) {
      this.mobileActiveTab = tab
    },
    setColumns(columns: ColumnDef[]) {
      this.currentColumns = columns
    },
    openVersions(versions: StandardVersion[]) {
      this.selectedVersions = versions
      this.showVersionHistory = true
    },
    closeVersions() {
      this.showVersionHistory = false
      this.selectedVersions = []
    },
    openHelp() {
      this.showHelp = true
    },
    closeHelp() {
      this.showHelp = false
    },
  },
})
