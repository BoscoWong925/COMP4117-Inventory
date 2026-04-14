<template>
  <Transition name="action-overlay">
    <div v-if="actionInProgress" class="action-overlay">
      <div class="action-overlay-card">
        <div class="action-overlay-spinner"></div>
        <p class="action-overlay-msg">{{ actionMessage || 'Processing...' }}</p>
        <p v-if="actionProgress" class="action-overlay-progress">{{ actionProgress }}</p>
      </div>
    </div>
  </Transition>
</template>

<script>
import { useActionLock } from '../hooks/useActionLock'

export default {
  setup() {
    const { actionInProgress, actionMessage, actionProgress } = useActionLock()
    return { actionInProgress, actionMessage, actionProgress }
  }
}
</script>

<style scoped>
.action-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
}

.action-overlay-card {
  background: var(--card, #fff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 0.75rem;
  padding: 2rem 2.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  min-width: 14rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.action-overlay-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--border, #e5e7eb);
  border-top-color: var(--accent, #3b82f6);
  border-radius: 50%;
  animation: action-spin 0.7s linear infinite;
}

.action-overlay-msg {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary, #111);
  text-align: center;
  margin: 0;
}

.action-overlay-progress {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--muted-foreground, #6b7280);
  margin: 0;
  font-variant-numeric: tabular-nums;
}

@keyframes action-spin {
  to { transform: rotate(360deg); }
}

/* Transition */
.action-overlay-enter-active,
.action-overlay-leave-active {
  transition: opacity 0.2s ease;
}
.action-overlay-enter-from,
.action-overlay-leave-to {
  opacity: 0;
}
</style>
