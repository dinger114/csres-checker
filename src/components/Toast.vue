<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="toast.visible()" class="toast">
        {{ toast.message() }}
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '../composables/useToast'

const toast = useToast()
</script>

<style scoped>
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  letter-spacing: 0.3px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
