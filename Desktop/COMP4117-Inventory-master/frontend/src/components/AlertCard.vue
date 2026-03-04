<template>
  <button :class="['alert-card', severity]" @click="$emit('click')">
    <div class="alert-card-count">{{ count }}</div>
    <div class="alert-card-label">{{ label }}</div>
    <div v-if="sublabel" class="alert-card-sub">{{ sublabel }}</div>
    <span class="alert-card-action">View &rarr;</span>
  </button>
</template>

<script>
export default {
  props: {
    count: { type: [Number, String], default: 0 },
    label: { type: String, required: true },
    sublabel: { type: String, default: '' },
    severity: { type: String, default: 'neutral' } // 'danger' | 'warning' | 'neutral'
  },
  emits: ['click']
}
</script>

<style scoped>
.alert-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 1rem 1.125rem;
  border-radius: 0.625rem;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  cursor: pointer;
  transition: box-shadow 0.15s, border-color 0.15s;
  text-align: left;
  min-width: 0;
}
.alert-card:hover {
  box-shadow: 0 2px 8px var(--shadow-color);
}

/* Severity variants */
.alert-card.danger {
  border-left: 3px solid var(--danger);
}
.alert-card.danger .alert-card-count { color: var(--danger); }

.alert-card.warning {
  border-left: 3px solid var(--warning);
}
.alert-card.warning .alert-card-count { color: var(--warning); }

.alert-card.neutral {
  border-left: 3px solid var(--accent);
}
.alert-card.neutral .alert-card-count { color: var(--accent); }

.alert-card-count {
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
}
.alert-card-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-top: 0.25rem;
}
.alert-card-sub {
  font-size: 0.6875rem;
  color: var(--text-muted);
  margin-top: 0.125rem;
}
.alert-card-action {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
  margin-top: 0.5rem;
}
</style>
