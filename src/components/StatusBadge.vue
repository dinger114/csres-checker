<template>
  <n-tooltip v-if="replacedBy && isAbolished" trigger="click" placement="right">
    <template #trigger>
      <span class="status-badge" :class="badgeClass" @click="handleClick">
        {{ status }}
      </span>
    </template>
    <div class="replace-info">
      <span>已被</span>
      <strong class="replace-number" @click="copyReplace">{{ replacedBy }}</strong>
      <span>替代</span>
    </div>
  </n-tooltip>
  <span v-else class="status-badge" :class="badgeClass">
    {{ status }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NTooltip, useMessage } from 'naive-ui'

const props = defineProps<{
  status: string
  replacedBy: string
}>()

const message = useMessage()

const isAbolished = computed(() =>
  props.status === '被代替' || props.status === '废止' || props.status === '作废'
)

const badgeClass = computed(() => {
  if (props.status === '现行') return 'badge-active'
  if (props.status === '即将实施') return 'badge-upcoming'
  if (isAbolished.value) return 'badge-deprecated'
  return ''
})

function handleClick() {
  // handled by n-tooltip
}

function copyReplace() {
  navigator.clipboard.writeText(props.replacedBy).then(() => {
    message.success('已复制: ' + props.replacedBy)
  })
}
</script>

<style scoped>
.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: default;
}

.badge-active {
  background: var(--badge-active-bg);
  color: #27c93f;
  border: 1px solid var(--badge-active-border);
}

.badge-deprecated {
  background: var(--badge-deprecated-bg);
  color: #ff5f56;
  border: 1px solid var(--badge-deprecated-border);
  cursor: pointer;
}

.badge-upcoming {
  background: var(--badge-upcoming-bg);
  color: #ffbd2e;
  border: 1px solid var(--badge-upcoming-border);
}

.replace-number {
  margin: 0 4px;
  cursor: pointer;
  color: var(--primary);
}

.replace-number:hover {
  text-decoration: underline;
}
</style>
