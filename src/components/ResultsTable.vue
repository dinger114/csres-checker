<template>
  <div class="results-card terminal-box">
    <div class="terminal-header">
      <span class="dot dot-r"></span>
      <span class="dot dot-y"></span>
      <span class="dot dot-g"></span>
      <span class="title">OUTPUT</span>
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
              <th class="num">#</th>
              <th>QUERY</th>
              <th>STD NO</th>
              <th>TITLE</th>
              <th>STATUS</th>
              <th>PUBLISHED</th>
              <th>IMPLEMENTED</th>
              <th>道客巴巴</th>
              <th>搜建筑</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, idx) in filteredResults" :key="idx">
              <td class="num">{{ idx + 1 }}</td>
              <td class="clickable" @click="copyCell($event, r.query)">{{ r.query }}</td>
              <td class="clickable" @click="copyCell($event, r.standard_number)">{{ r.standard_number }}</td>
              <td class="clickable" @click="copyCell($event, r.title)">{{ r.title }}</td>
              <td>
                <StatusBadge :status="r.status" :replacedBy="r.replaced_by" />
              </td>
              <td class="clickable" @click="copyCell($event, r.publish_date)">{{ r.publish_date }}</td>
              <td class="clickable" @click="copyCell($event, r.implement_date)">{{ r.implement_date }}</td>
              <td>
                <a :href="doc88Url(r)" target="_blank" rel="noopener">道客巴巴</a>
              </td>
              <td>
                <a :href="sjzUrl(r)" target="_blank" rel="noopener">搜建筑</a>
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

const filters = [
  { label: 'ALL', value: 'all' },
  { label: '现行', value: '现行' },
  { label: '废止', value: '废止' },
  { label: '即将实施', value: '即将实施' },
]

const statusFilter = ref('all')

const filteredResults = computed(() => {
  if (statusFilter.value === 'all') return props.results
  return props.results.filter((r) => r.status === statusFilter.value)
})

watch(() => props.results, () => {
  statusFilter.value = 'all'
})

function doc88Url(r: StandardResult): string {
  return `https://www.doc88.com/tag/${encodeURIComponent(r.standard_number || '')}`
}

function sjzUrl(r: StandardResult): string {
  return `https://www.soujianzhu.cn/Search/SouGuifan.aspx?skey=${encodeURIComponent((r.standard_number || '').toLowerCase())}`
}

function copyCell(e: MouseEvent, text: string) {
  navigator.clipboard.writeText(text).then(() => {
    const el = e.target as HTMLElement
    el.style.color = 'var(--primary)'
    setTimeout(() => (el.style.color = ''), 500)
  })
}
</script>

<style scoped>
.filter-group {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.filter-btn {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 10px;
  padding: 2px 8px;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.15s;
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
</style>
