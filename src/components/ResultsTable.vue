<template>
  <div class="results-card terminal-box">
    <div class="terminal-header">
      <span class="dot dot-r"></span>
      <span class="dot dot-y"></span>
      <span class="dot dot-g"></span>
      <span class="title">OUTPUT</span>
      <span v-if="selectedCount > 0" class="selected-hint">{{ selectedCount }} selected</span>
      <button v-if="selectedCount > 0" class="copy-sel-btn" @click="copySelected">COPY SEL</button>
      <div v-if="results.length > 0" class="filter-group">
        <button
          v-for="f in filters"
          :key="f.value"
          class="filter-btn"
          :class="{ active: statusFilter === f.value }"
          @click="statusFilter = f.value"
        >{{ f.label }}</button>
      </div>
    </div>
    <div class="terminal-body" style="flex:1;display:flex;flex-direction:column;padding:0;overflow:hidden;">
      <div v-if="results.length === 0" class="empty-state"></div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="cb">
                <input type="checkbox" :checked="allVisibleSelected" @change="toggleSelectAll" />
              </th>
              <th class="num">#</th>
              <th
                v-for="col in columns"
                :key="col.key"
                :class="{ draggable: col.draggable, sortable: sortableKeys.includes(col.key), sorted: sortKey === col.key }"
                :draggable="col.draggable"
                @dragstart="onDragStart($event, col.key)"
                @dragover.prevent="onDragOver($event, col.key)"
                @dragend="onDragEnd"
                @drop="onDrop($event, col.key)"
                @click="sortableKeys.includes(col.key) && handleSort(col.key)"
              >{{ col.label }}<span v-if="sortableKeys.includes(col.key)" class="sort-icon">{{ getSortIcon(col.key) }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, idx) in filteredResults" :key="idx" :class="{ selected: isSelected(r._idx!) }">
              <td class="cb">
                <input type="checkbox" :checked="isSelected(r._idx)" @change="toggleSelect(r._idx!)" />
              </td>
              <td class="num">{{ idx + 1 }}</td>
              <td v-for="col in columns" :key="col.key" :class="getCellClass(col)">
                <template v-if="col.key === 'status'">
                  <StatusBadge :status="r.status" :replacedBy="r.replaced_by" />
                </template>
                <template v-else-if="col.key === 'doc88'">
                  <a :href="doc88Url(r)" target="_blank" rel="noopener">道客巴巴</a>
                </template>
                <template v-else-if="col.key === 'soujz'">
                  <a :href="sjzUrl(r)" target="_blank" rel="noopener">搜建筑</a>
                </template>
                <template v-else-if="col.key === 'pdf'">
                  <a v-if="r.pdf_url" :href="r.pdf_url" target="_blank" rel="noopener">下载</a>
                  <span v-else class="pdf-empty">—</span>
                </template>
                <template v-else-if="col.key === 'standard_number'">
                  <span class="clickable" @click="handleStdClick($event, r)">
                    {{ getValue(r, col.key) }}
                    <span v-if="r.versions && r.versions.length > 1" class="version-badge" title="点击查看版本历史">v{{ r.versions.length }}</span>
                  </span>
                </template>
                <template v-else-if="col.key === 'title'">
                  <span class="clickable" @click="copyCell($event, `《${getValue(r, col.key)}》`)">《{{ getValue(r, col.key) }}》</span>
                </template>
                <template v-else>
                  <span class="clickable" @click="copyCell($event, getValue(r, col.key))">{{ getValue(r, col.key) }}</span>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import StatusBadge from './StatusBadge.vue'
import type { StandardResult } from '../types'

const props = defineProps<{
  results: StandardResult[]
}>()

const emit = defineEmits<{
  'update:columns': [columns: ColumnDef[]]
  'show-versions': [versions: import('../types').StandardVersion[]]
}>()

export interface ColumnDef {
  key: string
  label: string
  draggable: boolean
  exportable: boolean
}

const defaultColumns: ColumnDef[] = [
  { key: 'query', label: 'QUERY', draggable: true, exportable: true },
  { key: 'standard_number', label: 'STD NO', draggable: true, exportable: true },
  { key: 'title', label: 'TITLE', draggable: true, exportable: true },
  { key: 'status', label: 'STATUS', draggable: true, exportable: true },
  { key: 'publish_date', label: 'PUBLISHED', draggable: true, exportable: true },
  { key: 'implement_date', label: 'IMPLEMENTED', draggable: true, exportable: true },
  { key: 'doc88', label: '道客巴巴', draggable: true, exportable: false },
  { key: 'soujz', label: '搜建筑', draggable: true, exportable: false },
  { key: 'pdf', label: '地标预览', draggable: true, exportable: false },
]

const columns = ref<ColumnDef[]>([...defaultColumns])
const dragKey = ref<string | null>(null)
const sortKey = ref<string | null>(null)
const sortOrder = ref<'asc' | 'desc'>('asc')
const selectedIndices = ref(new Set<number>())

const sortableKeys = ['publish_date', 'implement_date']

const filters = [
  { label: 'ALL', value: 'all' },
  { label: '现行', value: '现行' },
  { label: '废止', value: '废止' },
  { label: '即将实施', value: '即将实施' },
]

const statusFilter = ref('all')

const filteredResults = computed(() => {
  let list = props.results.map((r, i) => ({ ...r, _idx: i }))
  if (statusFilter.value !== 'all') {
    list = list.filter((r) => r.status === statusFilter.value)
  }
  if (sortKey.value) {
    list = [...list].sort((a, b) => {
      const av = (a as any)[sortKey.value!] || ''
      const bv = (b as any)[sortKey.value!] || ''
      if (!av && !bv) return 0
      if (!av) return 1
      if (!bv) return -1
      const cmp = av.localeCompare(bv)
      return sortOrder.value === 'desc' ? -cmp : cmp
    })
  }
  return list
})

watch(() => props.results, () => {
  statusFilter.value = 'all'
  sortKey.value = null
  selectedIndices.value = new Set()
})

watch(columns, (cols) => {
  emit('update:columns', cols)
}, { deep: true, immediate: true })

function onDragStart(e: DragEvent, key: string) {
  dragKey.value = key
  e.dataTransfer!.effectAllowed = 'move'
}

function onDragOver(e: DragEvent, key: string) {
  e.dataTransfer!.dropEffect = 'move'
}

function onDrop(e: DragEvent, targetKey: string) {
  if (!dragKey.value || dragKey.value === targetKey) return
  const fromIdx = columns.value.findIndex((c) => c.key === dragKey.value)
  const toIdx = columns.value.findIndex((c) => c.key === targetKey)
  if (fromIdx === -1 || toIdx === -1) return
  const item = columns.value.splice(fromIdx, 1)[0]
  columns.value.splice(toIdx, 0, item)
}

function onDragEnd() {
  dragKey.value = null
}

function handleSort(colKey: string) {
  if (sortKey.value === colKey) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = colKey
    sortOrder.value = 'asc'
  }
}

function getSortIcon(colKey: string): string {
  if (sortKey.value !== colKey) return ''
  return sortOrder.value === 'asc' ? '▲' : '▼'
}

const selectedCount = computed(() => {
  return filteredResults.value.filter((r) => selectedIndices.value.has(r._idx!)).length
})

const allVisibleSelected = computed(() => {
  const visible = filteredResults.value
  if (visible.length === 0) return false
  return visible.every((r) => selectedIndices.value.has(r._idx!))
})

function isSelected(idx: number): boolean {
  return selectedIndices.value.has(idx)
}

function toggleSelect(idx: number) {
  const next = new Set(selectedIndices.value)
  if (next.has(idx)) {
    next.delete(idx)
  } else {
    next.add(idx)
  }
  selectedIndices.value = next
}

function toggleSelectAll() {
  const visible = filteredResults.value
  const allSelected = visible.every((r) => selectedIndices.value.has(r._idx!))
  const next = new Set(selectedIndices.value)
  for (const r of visible) {
    if (allSelected) {
      next.delete(r._idx!)
    } else {
      next.add(r._idx!)
    }
  }
  selectedIndices.value = next
}

async function copySelected() {
  const nums = props.results
    .filter((_, i) => selectedIndices.value.has(i))
    .map((r) => r.standard_number)
  if (nums.length === 0) return
  await navigator.clipboard.writeText(nums.join('\n'))
}

function getValue(r: StandardResult, key: string): string {
  return (r as any)[key] ?? ''
}

function getCellClass(col: ColumnDef): string {
  if (['status', 'publish_date', 'implement_date', 'doc88', 'soujz', 'pdf'].includes(col.key)) return 'text-center'
  if (col.key === 'num') return 'num'
  return 'clickable'
}

function doc88Url(r: StandardResult): string {
  return `https://www.doc88.com/tag/${encodeURIComponent(r.standard_number || '')}`
}

function sjzUrl(r: StandardResult): string {
  return `https://www.soujianzhu.cn/Search/Sou.aspx?skey=${encodeURIComponent(r.title || '')}`
}

function copyCell(e: MouseEvent, text: string) {
  navigator.clipboard.writeText(text).then(() => {
    const el = e.target as HTMLElement
    el.style.color = 'var(--primary)'
    setTimeout(() => (el.style.color = ''), 500)
  })
}

function handleStdClick(e: MouseEvent, r: StandardResult) {
  if (r.versions && r.versions.length > 1) {
    emit('show-versions', r.versions)
  } else {
    copyCell(e, r.standard_number)
  }
}

defineExpose({ columns })
</script>

<style scoped>
.filter-group {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.filter-btn {
  background: none;
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 10px;
  padding: 3px 10px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
  font-family: var(--font-mono);
  font-weight: 600;
}

.filter-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.filter-btn.active {
  background: var(--primary);
  color: var(--bg);
  border-color: var(--primary);
}

th.draggable {
  cursor: grab;
  user-select: none;
}

th.draggable:active {
  cursor: grabbing;
}

th.dragging-over {
  border-left: 2px solid var(--primary);
}

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

th.sortable {
  cursor: pointer;
  user-select: none;
}

th.sortable:hover {
  color: var(--primary);
}

.sort-icon {
  margin-left: 4px;
  font-size: 8px;
}

th.cb, td.cb {
  width: 28px;
  text-align: center;
  padding: 8px 4px !important;
}

th.cb input, td.cb input {
  width: 13px;
  height: 13px;
  accent-color: var(--primary);
  cursor: pointer;
}

.selected-hint {
  font-size: 10px;
  color: var(--primary);
  margin-left: 8px;
}

.copy-sel-btn {
  background: var(--primary) !important;
  color: var(--bg) !important;
  border-color: var(--primary) !important;
  font-size: 9px;
  padding: 2px 6px;
  margin-left: 8px;
  cursor: pointer;
}

tr.selected td { background: var(--selected-bg); }
tr.selected td:first-child { border-left: 2px solid var(--primary); }

.pdf-empty {
  color: var(--text-dim);
  opacity: 0.4;
}
</style>
