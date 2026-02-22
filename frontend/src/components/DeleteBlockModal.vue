<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg p-6 max-w-sm w-full text-center">
      <div class="text-4xl mb-3">⚠️</div>
      <h3 class="text-lg font-bold mb-2 text-red-700">Cannot Delete</h3>
      <p class="text-gray-600 mb-4">{{ message }}</p>
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
