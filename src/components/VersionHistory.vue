<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-box terminal-box">
        <div class="terminal-header">
          <span class="dot dot-r"></span>
          <span class="dot dot-y"></span>
          <span class="dot dot-g"></span>
          <span class="title">VERSION HISTORY</span>
          <button class="close-btn" @click="emit('close')">×</button>
        </div>
        <div class="terminal-body">
          <div v-if="versions.length === 0" class="empty">无版本历史</div>
          <table v-else>
            <thead>
              <tr>
                <th>标准号</th>
                <th>名称</th>
                <th>状态</th>
                <th>发布日期</th>
                <th>实施日期</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(v, i) in versions" :key="i" :class="{ current: v.status === '现行' }">
                <td class="clickable" @click="copyCell($event, v.standard_number)">{{ v.standard_number }}</td>
                <td class="clickable" @click="copyCell($event, v.title)">{{ v.title }}</td>
                <td>
                  <StatusBadge :status="v.status" replacedBy="" />
                </td>
                <td>{{ v.publish_date || '-' }}</td>
                <td>{{ v.implement_date || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import StatusBadge from './StatusBadge.vue'
import type { StandardVersion } from '../types'

defineProps<{
  visible: boolean
  versions: StandardVersion[]
}>()

const emit = defineEmits<{
  close: []
}>()

function copyCell(e: MouseEvent, text: string) {
  navigator.clipboard.writeText(text).then(() => {
    const el = e.target as HTMLElement
    el.style.color = 'var(--primary)'
    setTimeout(() => (el.style.color = ''), 500)
  })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-box {
  width: 100%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.terminal-body {
  overflow-y: auto;
  padding: 0;
}

.empty {
  padding: 40px;
  text-align: center;
  color: var(--text-dim);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  position: sticky;
  top: 0;
  background: var(--header-bg);
  color: var(--text-dim);
  font-weight: 600;
  text-align: center;
  padding: 10px 12px;
  border-bottom: 2px solid var(--border);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 10px;
  white-space: nowrap;
  z-index: 1;
}

td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--td-border);
  white-space: nowrap;
  font-size: 11px;
}

tr:hover td {
  background: var(--row-hover);
}

tr.current td {
  background: rgba(39, 201, 63, 0.05);
}

.clickable {
  cursor: pointer;
}

.clickable:hover {
  color: var(--primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  margin-left: 8px;
}

.close-btn:hover {
  color: var(--danger);
}

@media (max-width: 768px) {
  .modal-box {
    max-height: 90vh;
  }

  table {
    font-size: 10px;
  }

  th, td {
    padding: 6px 8px;
  }
}
</style>
