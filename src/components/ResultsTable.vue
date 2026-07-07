<template>
  <div class="results-card terminal-box">
    <div class="terminal-header">
      <span class="dot dot-red"></span>
      <span class="dot dot-yellow"></span>
      <span class="dot dot-green"></span>
      <span class="terminal-title">OUTPUT &nbsp; RESULTS &nbsp; {{ results.length }}</span>
    </div>
    <div class="table-wrap">
      <div v-if="results.length === 0" class="empty-state">
        <span class="cursor">_</span> 等待输入
      </div>
      <n-data-table
        v-else
        :columns="columns"
        :data="results"
        :bordered="false"
        :single-line="false"
        size="small"
        style="font-family: inherit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, computed } from 'vue'
import { NDataTable, NButton, NTooltip } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import type { StandardResult } from '../types'
import StatusBadge from './StatusBadge.vue'

const props = defineProps<{
  results: StandardResult[]
}>()

const emit = defineEmits<{
  'copy-md': []
}>()

function makeColumns(): DataTableColumns<StandardResult> {
  return [
    {
      title: '标准号',
      key: 'standard_number',
      width: 160,
      ellipsis: { tooltip: true },
    },
    {
      title: '名称',
      key: 'title',
      ellipsis: { tooltip: true },
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render(row: StandardResult) {
        return h(StatusBadge, {
          status: row.status,
          replacedBy: row.replaced_by,
        })
      },
    },
    {
      title: '发布日期',
      key: 'publish_date',
      width: 100,
    },
    {
      title: '实施日期',
      key: 'implement_date',
      width: 100,
    },
    {
      title: '链接',
      key: 'links',
      width: 120,
      render(row: StandardResult) {
        const no = row.standard_number.replace(/\s/g, '')
        return h('span', { class: 'links-cell' }, [
          h(
            'a',
            {
              href: `https://www.doc88.com/tag/${encodeURIComponent(row.title)}`,
              target: '_blank',
              rel: 'noopener',
              class: 'ext-link',
            },
            '道客'
          ),
          ' ',
          h(
            'a',
            {
              href: `https://www.sojianzhu.com/standard/detail?standardNo=${encodeURIComponent(no)}`,
              target: '_blank',
              rel: 'noopener',
              class: 'ext-link',
            },
            '搜建筑'
          ),
        ])
      },
    },
  ]
}

const columns = computed(makeColumns)
</script>

<style scoped>
.results-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.table-wrap {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-dim);
  font-size: 14px;
}

.cursor {
  animation: blink 1s step-end infinite;
  margin-right: 4px;
  color: var(--primary);
}

@keyframes blink {
  50% { opacity: 0; }
}

.links-cell {
  white-space: nowrap;
}

.ext-link {
  color: var(--link);
  text-decoration: none;
  font-size: 12px;
}

.ext-link:hover {
  text-decoration: underline;
}
</style>
