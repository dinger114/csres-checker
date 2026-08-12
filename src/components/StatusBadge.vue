<script setup lang="ts">
import { computed, ref } from 'vue'
import { useToastStore } from '../stores/toast'

const props = defineProps<{
  status: string
  replacedBy: string
}>()

const toast = useToastStore()
const showPopover = ref(false)

const isAbolished = computed(() =>
  props.status === '被代替' || props.status === '废止' || props.status === '作废',
)

const badgeClass = computed(() => {
  if (props.status === '现行')
    return 'badge-active'
  if (props.status === '即将实施')
    return 'badge-upcoming'
  if (isAbolished.value)
    return 'badge-deprecated'
  return ''
})

function togglePopover() {
  showPopover.value = !showPopover.value
}

function copyReplace() {
  navigator.clipboard.writeText(props.replacedBy).then(() => {
    toast.show(`已复制: ${props.replacedBy}`)
  })
}
</script>

<template>
  <span v-if="replacedBy && isAbolished" class="badge-wrap">
    <span class="status-badge" :class="badgeClass" @click="togglePopover">
      {{ status }}
    </span>
    <div v-if="showPopover" class="replace-info">
      <span>已被</span>
      <strong class="replace-number" @click="copyReplace">{{ replacedBy }}</strong>
      <span>替代</span>
    </div>
  </span>
  <span v-else class="status-badge" :class="badgeClass">
    {{ status }}
  </span>
</template>

<style scoped>
.badge-wrap {
  position: relative;
  display: inline-block;
}

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
  color: var(--badge-active-text);
  border: 1px solid var(--badge-active-border);
}

.badge-deprecated {
  background: var(--badge-deprecated-bg);
  color: var(--badge-deprecated-text);
  border: 1px solid var(--badge-deprecated-border);
  cursor: pointer;
}

.badge-upcoming {
  background: var(--badge-upcoming-bg);
  color: var(--badge-upcoming-text);
  border: 1px solid var(--badge-upcoming-border);
}

.replace-info {
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  white-space: nowrap;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  background: var(--tooltip-bg, #1a1f1a);
  color: var(--tooltip-text, #e0e0e0);
  border: 1px solid var(--border-color, #333);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
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
