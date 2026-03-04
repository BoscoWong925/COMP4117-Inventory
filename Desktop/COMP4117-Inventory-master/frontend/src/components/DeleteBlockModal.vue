<template>
  <div v-if="show" class="modal-overlay">
    <div class="modal-card max-w-sm w-full text-center">
      <div class="text-4xl mb-3" style="color:var(--danger);display:flex;justify-content:center"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
      <h3 class="text-lg font-bold mb-2" style="color:var(--danger)">Cannot Delete</h3>
      <p class="text-secondary mb-4">{{ message }}</p>
      <button @click="$emit('close')" class="btn btn-outline-secondary px-6">OK</button>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    show: { type: Boolean, default: false },
    message: { type: String, default: 'This item is currently in use and cannot be deleted.' }
  },
  emits: ['close']
}
</script>
