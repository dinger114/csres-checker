<template>
  <aside class="log-panel">
    <div class="log-header">
      <span class="dot dot-r"></span>
      <span class="dot dot-y"></span>
      <span class="dot dot-g"></span>
      <span class="title">TERMINAL</span>
    </div>
    <div class="log-body" ref="logBodyRef">
      <div
        v-for="(line, i) in lines"
        :key="i"
        class="log-line"
      >
        <span class="log-time">{{ line.time }}</span>
        <span class="log-msg" :class="line.type">{{ line.message }}</span>
      </div>
    </div>
    <LogStats />
  </aside>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import LogStats from './LogStats.vue'
import { useLog } from '../composables/useLog'

const { lines } = useLog()
const logBodyRef = ref<HTMLElement | null>(null)

watch(
  lines,
  async () => {
    await nextTick()
    if (logBodyRef.value) {
      logBodyRef.value.scrollTop = logBodyRef.value.scrollHeight
    }
  },
  { deep: true }
)
</script>
