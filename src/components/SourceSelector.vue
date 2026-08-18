<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  modelValue: string
  sources: Array<{ key: string, label: string }>
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useI18n()
</script>

<template>
  <div class="source-row">
    <span class="source-label">{{ t('input.source_label') }}</span>
    <!-- Desktop: radio buttons -->
    <div class="source-radios">
      <label class="source-check">
        <input
          type="radio"
          :checked="modelValue === ''"
          :disabled="disabled"
          @change="emit('update:modelValue', '')"
        >
        <span>{{ t('input.source_default') }}</span>
      </label>
      <label v-for="src in sources" :key="src.key" class="source-check">
        <input
          type="radio"
          :checked="modelValue === src.key"
          :disabled="disabled"
          @change="emit('update:modelValue', src.key)"
        >
        <span>{{ src.label }}</span>
      </label>
    </div>
    <!-- Mobile: dropdown select -->
    <select
      class="source-select"
      :value="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">
        {{ t('input.source_default') }}
      </option>
      <option v-for="src in sources" :key="src.key" :value="src.key">
        {{ src.label }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.source-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 0;
  padding: 8px 0 4px;
  flex-wrap: wrap;
}

.source-radios {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.source-select {
  display: none;
  width: 100%;
  padding: 6px 8px;
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-dim);
  background: var(--bg);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  cursor: pointer;
}

.source-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.source-label {
  font-size: 12px;
  color: var(--text-dim);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  line-height: 13px;
  white-space: nowrap;
  transform: translateY(-3px);
}

.source-check {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  height: 13px;
  color: var(--text-dim);
  cursor: pointer;
  white-space: nowrap;
}

.source-check input[type="radio"] {
  width: 13px;
  height: 13px;
  margin: 0;
  flex-shrink: 0;
  accent-color: var(--primary);
  cursor: pointer;
}

.source-check:hover {
  color: var(--primary);
}

@media (max-width: 640px) {
  .source-label {
    display: none;
  }

  .source-radios {
    display: none;
  }

  .source-select {
    display: block;
  }
}
</style>
