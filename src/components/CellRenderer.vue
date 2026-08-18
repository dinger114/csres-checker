<script setup lang="ts">
import type { StandardResult, StandardVersion } from '../types'
import type { ColumnDef } from './ResultsTable.vue'
import StatusBadge from './StatusBadge.vue'

defineProps<{
  col: ColumnDef
  row: StandardResult & { _idx: number }
  copiedCell: string | null
}>()

const emit = defineEmits<{
  'copy': [text: string, cellId: string]
  'show-versions': [versions: StandardVersion[]]
}>()

function getValue(r: StandardResult, key: string): string {
  const value = r[key as keyof StandardResult]
  return typeof value === 'string' ? value : ''
}

function doc88Url(r: StandardResult): string {
  return `https://www.doc88.com/tag/${encodeURIComponent(r.standard_number || '')}`
}

function sjzUrl(r: StandardResult): string {
  return `https://www.soujianzhu.cn/Search/Sou.aspx?skey=${encodeURIComponent(r.title || '')}`
}

function jzxxUrl(r: StandardResult): string {
  return `https://jzxx.vip/search/pan_view_search.html?name=${encodeURIComponent(r.standard_number || r.title || '')}&type=1`
}

function handleStdClick(r: StandardResult & { _idx: number }) {
  if (r.versions && r.versions.length > 1) {
    emit('show-versions', r.versions)
  }
  else {
    emit('copy', r.standard_number, `${r._idx}:std`)
  }
}
</script>

<template>
  <template v-if="col.key === 'status'">
    <StatusBadge :status="row.status" :replaced-by="row.replaced_by" />
  </template>
  <template v-else-if="col.key === 'doc88'">
    <a :href="doc88Url(row)" target="_blank" rel="noopener">道客巴巴</a>
  </template>
  <template v-else-if="col.key === 'soujz'">
    <a :href="sjzUrl(row)" target="_blank" rel="noopener">搜建筑</a>
  </template>
  <template v-else-if="col.key === 'jzxx'">
    <a :href="jzxxUrl(row)" target="_blank" rel="noopener">筑森档案</a>
  </template>
  <template v-else-if="col.key === 'pdf'">
    <a v-if="row.pdf_url" :href="row.pdf_url" target="_blank" rel="noopener">下载</a>
    <span v-else class="pdf-empty">—</span>
  </template>
  <template v-else-if="col.key === 'standard_number'">
    <span class="clickable" @click="handleStdClick(row)">
      {{ getValue(row, col.key) }}
      <span v-if="row.versions && row.versions.length > 1" class="version-badge" title="点击查看版本历史">v{{ row.versions.length }}</span>
    </span>
  </template>
  <template v-else-if="col.key === 'title'">
    <span class="clickable" @click="emit('copy', `《${getValue(row, col.key)}》`, `${row._idx}:${col.key}`)">《{{ getValue(row, col.key) }}》</span>
  </template>
  <template v-else>
    <span class="clickable" @click="emit('copy', getValue(row, col.key), `${row._idx}:${col.key}`)">{{ getValue(row, col.key) }}</span>
  </template>
</template>

<style scoped>
.version-badge {
  display: inline-block;
  font-size: 9px;
  background: var(--primary);
  color: var(--bg);
  padding: 1px 4px;
  border-radius: 3px;
  margin-left: 4px;
  vertical-align: middle;
  cursor: pointer;
}

.pdf-empty {
  color: var(--text-dim);
  opacity: 0.4;
}
</style>
