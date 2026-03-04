<template>
  <div class="theme-card border rounded-lg p-4 hover:shadow-md transition">
    <h4 class="font-bold mb-2" style="color:var(--text-primary)">{{ title }}</h4>
    <p class="text-sm text-secondary">{{ description }}</p>
  </div>
</template>

<script>
export default {
  props: {
    title: String,
    description: String,
    color: {
      type: String,
      default: ''
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
