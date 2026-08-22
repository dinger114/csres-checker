<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCap } from '../composables/useCap'
import { useFocusTrap } from '../composables/useFocusTrap'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  solved: []
  close: []
}>()

const { t } = useI18n()
const { solved, ensureSolved, hasValidToken } = useCap()

const phase = ref<'solving' | 'success' | 'error'>('solving')
const errorMsg = ref('')
const startCount = ref(0)

const { container } = useFocusTrap(() => props.visible)

async function startSolve() {
  phase.value = 'solving'
  errorMsg.value = ''
  try {
    await ensureSolved()
    // 让用户看到验证已通过，避免一闪而过
    phase.value = 'success'
    setTimeout(emit, 900, 'solved')
  }
  catch (e) {
    phase.value = 'error'
    errorMsg.value = e instanceof Error ? e.message : String(e)
  }
}

watch(() => props.visible, (val) => {
  if (val && !solved.value && !hasValidToken()) {
    startCount.value++
    void startSolve()
  }
})

function retry() {
  startCount.value++
  void startSolve()
}

const solving = computed(() => phase.value === 'solving')
const success = computed(() => phase.value === 'success')
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="challenge-overlay">
      <div ref="container" class="challenge-box terminal-box" role="dialog" aria-modal="true" :aria-label="t('challenge.title')" tabindex="-1">
        <div class="terminal-header">
          <span class="dot dot-r" />
          <span class="dot dot-y" />
          <span class="dot dot-g" />
          <span class="title">{{ t('challenge.title') }}</span>
        </div>
        <div class="terminal-body challenge-body">
          <template v-if="solving">
            <div class="spinner" aria-hidden="true">
              <span v-for="i in 4" :key="i" class="spinner-dot" :style="{ animationDelay: `${(i - 1) * 0.12}s` }" />
            </div>
            <p class="challenge-msg">
              {{ t('challenge.solving') }}
            </p>
            <p class="challenge-hint">
              {{ t('challenge.hint') }}
            </p>
          </template>
          <template v-else-if="success">
            <div class="checkmark" aria-hidden="true">
              <svg viewBox="0 0 36 36">
                <path class="checkmark-path" d="M8 18.5 L15 25.5 L28 11" />
              </svg>
            </div>
            <p class="challenge-msg challenge-success">
              {{ t('challenge.passed') }}
            </p>
          </template>
          <template v-else>
            <p class="challenge-msg challenge-error">
              {{ t('challenge.failed') }}
            </p>
            <p v-if="errorMsg" class="challenge-hint">
              {{ errorMsg }}
            </p>
            <div class="challenge-actions">
              <button class="btn-retry" @click="retry">
                {{ t('challenge.retry') }}
              </button>
              <button class="btn-skip" @click="emit('close')">
                {{ t('challenge.skip') }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.challenge-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 20px;
}

.challenge-box {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.challenge-body {
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.spinner {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
}

.spinner-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--primary);
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 100% { transform: scale(0.4); opacity: 0.4; }
  50% { transform: scale(1); opacity: 1; }
}

.challenge-msg {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  font-family: var(--font-mono);
  letter-spacing: 0.5px;
}

.challenge-error {
  color: var(--danger);
}

.challenge-success {
  color: var(--primary);
}

.checkmark {
  width: 44px;
  height: 44px;
  margin-bottom: 16px;
  color: var(--primary);
}

.checkmark svg {
  width: 100%;
  height: 100%;
}

.checkmark-path {
  fill: none;
  stroke: var(--primary);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 36;
  stroke-dashoffset: 36;
  animation: checkmark-draw 0.45s ease-out 0.1s forwards;
}

@keyframes checkmark-draw {
  to { stroke-dashoffset: 0; }
}

.challenge-hint {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.7;
  max-width: 320px;
}

.challenge-actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.btn-retry {
  background: var(--primary);
  color: var(--bg);
  border-color: var(--primary);
  font-weight: 700;
}

.btn-retry:hover {
  opacity: 0.9;
  color: var(--bg);
}

.btn-skip {
  background: transparent;
  color: var(--text-secondary);
  border-color: var(--border-subtle);
}

@media (prefers-reduced-motion: reduce) {
  .spinner-dot { animation: none; opacity: 0.7; }
  .checkmark-path { animation: none; stroke-dashoffset: 0; }
}

@media (max-width: 768px) {
  .challenge-body { padding: 24px 16px; }
}
</style>
