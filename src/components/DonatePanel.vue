<template>
  <div class="donate-tab" :class="{ expanded }" @click="expanded = !expanded">
    <div class="donate-tab-label">
      <span class="chevron">{{ expanded ? '◀' : '▶' }}</span>
      <span class="label-text">支持</span>
    </div>
    <div class="donate-tab-panel" @click.stop>
      <img
        src="https://cdn.nodeimage.com/i/I7UXCYjlFlljFqwba3piPYxsi8qEFNhE.png"
        alt="感谢支持"
        class="donate-qr"
      />
      <p class="donate-text">感谢支持 ❤</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const expanded = ref(false)
</script>

<style scoped>
.donate-tab {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  cursor: pointer;
}

.donate-tab-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 6px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-right: none;
  border-radius: 8px 0 0 8px;
  transition: all 0.2s;
}

.donate-tab-label:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.chevron {
  font-size: 10px;
  color: var(--text-dim);
}

.label-text {
  font-size: 12px;
  color: var(--text-dim);
  writing-mode: vertical-rl;
}

.donate-tab-panel {
  position: absolute;
  top: 50%;
  right: 100%;
  transform: translateY(-50%) translateX(10px);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  white-space: nowrap;
}

.donate-tab.expanded .donate-tab-panel {
  opacity: 1;
  visibility: visible;
  transform: translateY(-50%) translateX(0);
}

.donate-qr {
  width: 150px;
  height: 150px;
  border-radius: 8px;
}

.donate-text {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-dim);
}

@media (max-width: 768px) {
  .donate-tab {
    display: none;
  }
}
</style>
