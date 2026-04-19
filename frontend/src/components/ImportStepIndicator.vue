<template>
  <div class="step-indicator">
    <div
      v-for="s in steps"
      :key="s.num"
      class="step-indicator__item"
      :class="{
        'step-indicator__item--active': s.num === current,
        'step-indicator__item--done': s.num < current,
        'step-indicator__item--disabled': s.num > maxReachable,
      }"
      @click="canNavigate(s.num) && $emit('go', s.num)"
    >
      <span class="step-indicator__circle">
        <template v-if="s.num < current">✓</template>
        <template v-else>{{ s.num }}</template>
      </span>
      <span class="step-indicator__label">{{ s.label }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ImportStepIndicator',
  props: {
    current: { type: Number, required: true },
    maxReachable: { type: Number, default: 7 },
  },
  emits: ['go'],
  computed: {
    steps() {
      return [
        { num: 1, label: 'Upload' },
        { num: 2, label: 'Header' },
        { num: 3, label: 'Line Items' },
        { num: 4, label: 'Fields' },
        { num: 5, label: 'Confirm' },
        { num: 6, label: 'Creating' },
        { num: 7, label: 'Summary' },
      ]
    },
  },
  methods: {
    canNavigate(num) {
      // Can only navigate back to completed steps (not steps 6/7 which are auto)
      return num < this.current && num <= 5
    },
  },
}
</script>

<style scoped>
.step-indicator {
  display: flex;
  align-items: flex-start;
  gap: 0.25rem;
  margin-bottom: 1.25rem;
  padding: 0.5rem 0;
  overflow-x: auto;
}
.step-indicator__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
  min-width: 3.5rem;
  cursor: default;
  position: relative;
}
.step-indicator__item::after {
  content: '';
  position: absolute;
  top: 0.75rem;
  left: calc(50% + 0.75rem);
  right: calc(-50% + 0.75rem);
  height: 2px;
  background: var(--border);
  z-index: 0;
}
.step-indicator__item:last-child::after {
  display: none;
}
.step-indicator__item--done::after {
  background: var(--accent);
}
.step-indicator__item--active::after {
  background: var(--border);
}
.step-indicator__item--done {
  cursor: pointer;
}
.step-indicator__circle {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 700;
  border: 2px solid var(--border);
  background: var(--card);
  color: var(--muted-foreground);
  position: relative;
  z-index: 1;
  transition: all 0.2s;
}
.step-indicator__item--active .step-indicator__circle {
  border-color: var(--accent);
  background: var(--accent);
  color: white;
}
.step-indicator__item--done .step-indicator__circle {
  border-color: var(--accent);
  background: var(--accent-surface);
  color: var(--accent);
}
.step-indicator__item--disabled .step-indicator__circle {
  opacity: 0.4;
}
.step-indicator__label {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--muted-foreground);
  text-align: center;
  white-space: nowrap;
}
.step-indicator__item--active .step-indicator__label {
  color: var(--accent);
}
.step-indicator__item--done .step-indicator__label {
  color: var(--foreground);
}
.step-indicator__item--disabled .step-indicator__label {
  opacity: 0.4;
}
</style>
