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
      <table v-else class="result-table">
        <thead id="thead">
          <tr>
            <th class="col-num">#</th>
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
        <tbody id="tbody">
          <tr v-for="(r, idx) in results" :key="idx">
            <td class="col-num">{{ idx + 1 }}</td>
            <td class="clickable" @click="copyCell($event, r.query)">{{ r.query }}</td>
            <td class="clickable" @click="copyCell($event, r.standard_number)">{{ r.standard_number }}</td>
            <td class="clickable" @click="copyCell($event, r.title)">{{ r.title }}</td>
            <td>
              <StatusBadge :status="r.status" :replacedBy="r.replaced_by" />
            </td>
            <td class="clickable" @click="copyCell($event, r.publish_date)">{{ r.publish_date }}</td>
            <td class="clickable" @click="copyCell($event, r.implement_date)">{{ r.implement_date }}</td>
            <td>
              <a :href="doc88Url(r)" target="_blank" rel="noopener" class="ext-link">道客巴巴</a>
            </td>
            <td>
              <a :href="sjzUrl(r)" target="_blank" rel="noopener" class="ext-link">搜建筑</a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import StatusBadge from './StatusBadge.vue'
import type { StandardResult } from '../types'

defineProps<{
  results: StandardResult[]
}>()

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

.result-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.result-table th {
  text-align: left;
  padding: 8px 10px;
  border-bottom: 2px solid var(--border);
  background: var(--header-bg);
  font-weight: 600;
  font-size: 12px;
  color: var(--text-dim);
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}

.result-table td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--td-border);
  color: var(--text);
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-table tr:hover td {
  background: var(--row-hover);
}

.col-num {
  width: 30px;
  text-align: center;
  color: var(--text-dim);
}

.clickable {
  cursor: pointer;
}

.clickable:hover {
  color: var(--primary);
}

.ext-link {
  color: var(--link);
  text-decoration: none;
  font-size: 12px;
  white-space: nowrap;
}

.ext-link:hover {
  text-decoration: underline;
}
</style>
