<script setup lang="ts">
import type { StandardResult, StandardVersion } from '../types'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CellRenderer from './CellRenderer.vue'

const props = defineProps<{
  results: StandardResult[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:columns': [columns: ColumnDef[]]
  'show-versions': [versions: StandardVersion[]]
}>()

const { t } = useI18n()

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
const focusedColKey = ref<string | null>(null)
const sortKey = ref<string | null>(null)
const sortOrder = ref<'asc' | 'desc'>('asc')
const selectedIndices = ref(new Set<number>())
const copiedCell = ref<string | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const sortableKeys = ['publish_date', 'implement_date']

const filters = computed(() => [
  { label: t('output.filter_all'), value: 'all' },
  { label: t('output.filter_active'), value: '现行' },
  { label: t('output.filter_deprecated'), value: '废止' },
  { label: t('output.filter_upcoming'), value: '即将实施' },
])

const statusFilter = ref('all')

const filteredResults = computed(() => {
  let list = props.results.map((r, i) => ({ ...r, _idx: i }))
  if (statusFilter.value !== 'all') {
    list = list.filter(r => r.status === statusFilter.value)
  }
  if (sortKey.value) {
    list = [...list].sort((a, b) => {
      const av = getValue(a, sortKey.value!)
      const bv = getValue(b, sortKey.value!)
      if (!av && !bv)
        return 0
      if (!av)
        return 1
      if (!bv)
        return -1
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

function onDragOver(e: DragEvent, _key: string) {
  e.dataTransfer!.dropEffect = 'move'
}

function onDrop(e: DragEvent, targetKey: string) {
  if (!dragKey.value || dragKey.value === targetKey)
    return
  const fromIdx = columns.value.findIndex(c => c.key === dragKey.value)
  const toIdx = columns.value.findIndex(c => c.key === targetKey)
  if (fromIdx === -1 || toIdx === -1)
    return
  const item = columns.value.splice(fromIdx, 1)[0]
  columns.value.splice(toIdx, 0, item)
}

function onDragEnd() {
  dragKey.value = null
}

function onColKeydown(e: KeyboardEvent, colKey: string) {
  if (!e.shiftKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight'))
    return
  e.preventDefault()
  const col = columns.value.find(c => c.key === colKey)
  if (!col || !col.draggable)
    return
  const idx = columns.value.indexOf(col)
  const newIdx = e.key === 'ArrowLeft' ? idx - 1 : idx + 1
  if (newIdx < 0 || newIdx >= columns.value.length)
    return
  const item = columns.value.splice(idx, 1)[0]
  columns.value.splice(newIdx, 0, item)
  focusedColKey.value = colKey
}

function handleSort(colKey: string) {
  if (sortKey.value === colKey) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  }
  else {
    sortKey.value = colKey
    sortOrder.value = 'asc'
  }
}

function getSortIcon(colKey: string): string {
  if (sortKey.value !== colKey)
    return ''
  return sortOrder.value === 'asc' ? '▲' : '▼'
}

const selectedCount = computed(() => {
  return filteredResults.value.filter(r => selectedIndices.value.has(r._idx!)).length
})

const allVisibleSelected = computed(() => {
  const visible = filteredResults.value
  if (visible.length === 0)
    return false
  return visible.every(r => selectedIndices.value.has(r._idx!))
})

function isSelected(idx: number): boolean {
  return selectedIndices.value.has(idx)
}

function toggleSelect(idx: number) {
  const next = new Set(selectedIndices.value)
  if (next.has(idx)) {
    next.delete(idx)
  }
  else {
    next.add(idx)
  }
  selectedIndices.value = next
}

function toggleSelectAll() {
  const visible = filteredResults.value
  const allSelected = visible.every(r => selectedIndices.value.has(r._idx!))
  const next = new Set(selectedIndices.value)
  for (const r of visible) {
    if (allSelected) {
      next.delete(r._idx!)
    }
    else {
      next.add(r._idx!)
    }
  }
  selectedIndices.value = next
}

async function copySelected() {
  const nums = props.results
    .filter((_, i) => selectedIndices.value.has(i))
    .map(r => r.standard_number)
  if (nums.length === 0)
    return
  await navigator.clipboard.writeText(nums.join('\n'))
}

function getValue(r: StandardResult, key: string): string {
  const value = r[key as keyof StandardResult]
  return typeof value === 'string' ? value : ''
}

function getCellClass(col: ColumnDef): string {
  if (['status', 'publish_date', 'implement_date', 'doc88', 'soujz', 'pdf'].includes(col.key))
    return 'text-center'
  if (col.key === 'num')
    return 'num'
  return 'clickable'
}

function copyCell(text: string, cellId: string) {
  navigator.clipboard.writeText(text).then(() => {
    copiedCell.value = cellId
    if (copiedTimer)
      clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copiedCell.value = null
    }, 500)
  })
}

defineExpose({ columns })
</script>

<template>
  <div class="results-card terminal-box">
    <div class="terminal-header">
      <span class="dot dot-r" />
      <span class="dot dot-y" />
      <span class="dot dot-g" />
      <span class="title">{{ t('output.title') }}</span>
      <span v-if="selectedCount > 0" class="selected-hint">{{ selectedCount }} {{ t('output.selected') }}</span>
      <button v-if="selectedCount > 0" class="copy-sel-btn" @click="copySelected">
        {{ t('output.copy_sel') }}
      </button>
      <div v-if="results.length > 0" class="filter-group">
        <button
          v-for="f in filters"
          :key="f.value"
          class="filter-btn"
          :class="{ active: statusFilter === f.value }"
          @click="statusFilter = f.value"
        >
          {{ f.label }}
        </button>
      </div>
    </div>
    <div class="terminal-body" style="flex:1;display:flex;flex-direction:column;padding:0;overflow:hidden;">
      <div v-if="results.length === 0 && loading" class="skeleton-wrap" aria-hidden="true">
        <div v-for="i in 6" :key="i" class="skeleton-row">
          <span class="skeleton-cell" />
          <span class="skeleton-cell" />
          <span class="skeleton-cell wide" />
          <span class="skeleton-cell" />
        </div>
      </div>
      <div v-else-if="results.length === 0" class="empty-state" />
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="cb" scope="col">
                <input
                  type="checkbox"
                  :checked="allVisibleSelected"
                  aria-label="全选当前结果"
                  @change="toggleSelectAll"
                >
              </th>
              <th class="num" scope="col">
                #
              </th>
              <th
                v-for="col in columns"
                :key="col.key"
                scope="col"
                role="columnheader"
                :tabindex="col.draggable ? 0 : -1"
                :aria-label="`${col.label}, press Shift+Arrow to reorder`"
                :class="{ draggable: col.draggable, sortable: sortableKeys.includes(col.key), sorted: sortKey === col.key }"
                :draggable="col.draggable"
                @dragstart="onDragStart($event, col.key)"
                @dragover.prevent="onDragOver($event, col.key)"
                @dragend="onDragEnd"
                @drop="onDrop($event, col.key)"
                @keydown="onColKeydown($event, col.key)"
                @click="sortableKeys.includes(col.key) && handleSort(col.key)"
              >
                {{ col.label }}<span v-if="sortableKeys.includes(col.key)" class="sort-icon">{{ getSortIcon(col.key) }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, idx) in filteredResults" :key="idx" :class="{ selected: isSelected(r._idx!) }">
              <td class="cb">
                <input
                  type="checkbox"
                  :checked="isSelected(r._idx)"
                  :aria-label="`选择第 ${idx + 1} 行`"
                  @change="toggleSelect(r._idx!)"
                >
              </td>
              <td class="num">
                {{ idx + 1 }}
              </td>
              <td
                v-for="col in columns"
                :key="col.key"
                :class="[getCellClass(col), { copied: copiedCell === `${r._idx}:${col.key}` }]"
              >
                <CellRenderer
                  :col="col"
                  :row="r"
                  :copied-cell="copiedCell"
                  @copy="copyCell"
                  @show-versions="emit('show-versions', $event)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

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

th.draggable:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}

th.drag-over {
  border-left: 2px solid var(--primary);
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

td.copied { color: var(--primary) !important; }

/* 大结果集：跳过屏外行渲染，保持真实 table 语义 */
.table-wrap tbody tr {
  content-visibility: auto;
  contain-intrinsic-size: auto 44px;
}

.skeleton-wrap {
  flex: 1;
  overflow: hidden;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-row {
  display: flex;
  gap: 12px;
}

.skeleton-cell {
  height: 14px;
  flex: 1;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--border-subtle) 25%, var(--hover-bg) 50%, var(--border-subtle) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s infinite;
}

.skeleton-cell.wide {
  flex: 2;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
