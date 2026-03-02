<template>
  <div class="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="bg-white rounded-lg shadow-md p-8">
        <h1 class="text-3xl font-bold text-center mb-2">Inventory System</h1>
        <p class="text-center text-gray-600 mb-6">University COMP Department</p>

        <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {{ error }}
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              v-model="username"
              class="form-input"
              placeholder="Enter username"
            />
          </div>

          <div class="mb-6">
            <label class="block text-gray-700 text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              v-model="password"
              class="form-input"
              placeholder="Enter password"
            />
          </div>

          <button type="submit" class="btn w-full">
            Login
          </button>
        </form>

        <div v-if="showDemoCredentials" class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <p class="text-sm font-medium text-gray-700 mb-2">Demo Credentials:</p>
          <div class="text-xs text-gray-600 space-y-1">
            <p><strong>Admin:</strong> admin / admin123</p>
            <p><strong>Operator:</strong> operator / operator123</p>
            <p><strong>User:</strong> user / user123</p>
          </div>
          <button
            type="button"
            @click="showDemoCredentials = false"
            class="text-xs text-blue-600 mt-2 hover:underline"
          >
            Hide credentials
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  props: {
    onLogin: {
      type: Function,
      required: true
    }
  },
  setup(props) {
    const username = ref('')
    const password = ref('')
    const error = ref('')
    const showDemoCredentials = ref(false)

    const loading = ref(false)

    const handleSubmit = async () => {
      if (!username.value || !password.value) {
        error.value = 'Please enter username and password'
        return
      }

      error.value = ''
      loading.value = true
      try {
        const ok = await props.onLogin(username.value, password.value)
        if (!ok) {
          error.value = 'Invalid username or password'
        }
      } catch (e) {
        error.value = 'Login failed. Please try again.'
      } finally {
        loading.value = false
      }
    }

    return {
      username,
      password,
      error,
      showDemoCredentials,
      handleSubmit,
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
