<template>
  <div :class="`${color} border border-gray-200 rounded-lg p-4 hover:shadow-md transition`">
    <h4 class="font-bold text-gray-800 mb-2">{{ title }}</h4>
    <p class="text-sm text-gray-700">{{ description }}</p>
  </div>
</template>

<script>
export default {
  props: {
    title: String,
    description: String,
    color: {
      type: String,
      default: 'bg-blue-50'
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
