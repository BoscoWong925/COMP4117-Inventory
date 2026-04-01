<template>
  <div :class="['ui-spinner', sizeClass]" role="status" aria-label="Loading">
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle class="ui-spinner-track" cx="12" cy="12" r="10" stroke-width="3" />
      <path
        class="ui-spinner-arc"
        d="M12 2a10 10 0 0 1 10 10"
        stroke-width="3"
        stroke-linecap="round"
      />
    </svg>
    <span v-if="label" class="ui-spinner-label">{{ label }}</span>
  </div>
</template>

<script>
export default {
  name: 'UiSpinner',
  props: {
    size: { type: String, default: 'md', validator: v => ['sm', 'md', 'lg'].includes(v) },
    label: { type: String, default: '' }
  },
  computed: {
    sizeClass() { return `ui-spinner--${this.size}` }
  }
}
</script>

<style scoped>
.ui-spinner {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.ui-spinner svg {
  animation: uiSpin 0.75s linear infinite;
}
.ui-spinner-track {
  stroke: var(--border, #e5e7eb);
}
.ui-spinner-arc {
  stroke: var(--accent, #6366f1);
}
.ui-spinner--sm svg { width: 1rem;   height: 1rem; }
.ui-spinner--md svg { width: 1.5rem; height: 1.5rem; }
.ui-spinner--lg svg { width: 2.5rem; height: 2.5rem; }
.ui-spinner-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground, #6b7280);
}
@keyframes uiSpin {
  to { transform: rotate(360deg); }
}
</style>
