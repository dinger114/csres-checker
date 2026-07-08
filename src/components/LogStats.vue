<template>
  <div class="log-stats">
    <span><i class="dot dot-g"></i>OK:{{ stats.ok }}</span>
    <span><i class="dot dot-r"></i>EMPTY:{{ stats.empty }}</span>
    <span>TIME:{{ stats.time }}s</span>
    <span>Q:{{ stats.queries }}</span>
    <span>CACHE:{{ cacheSize }}</span>
    <span style="margin-left:auto;color:var(--primary);font-weight:600;">TOTAL:{{ globalCount }}</span>
  </div>
</template>

<script setup lang="ts">
import { useLog } from '../composables/useLog'
import { useFirebase } from '../composables/useFirebase'
import { useCache } from '../composables/useCache'

const { stats } = useLog()
const { globalCount } = useFirebase()
const { size } = useCache()

const cacheSize = size()
</script>
