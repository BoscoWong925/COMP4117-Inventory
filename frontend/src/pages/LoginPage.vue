<template>
  <div :class="['login-page', darkMode ? '' : 'light-mode']">
    <!-- Animated background -->
    <div class="login-bg">
      <div class="login-orb login-orb-1"></div>
      <div class="login-orb login-orb-2"></div>
      <div class="login-orb login-orb-3"></div>
    </div>

    <!-- Theme toggle -->
    <button @click="$emit('toggle-theme')" class="theme-toggle-login">
      {{ darkMode ? '☀️' : '🌙' }}
    </button>

    <div class="login-container">
      <div class="login-card">
        <!-- Logo + Title -->
        <div class="login-header">
          <div class="login-logo">📦</div>
          <h1 class="login-title">Inventory</h1>
          <p class="login-subtitle">COMP Department</p>
        </div>

        <!-- Error -->
        <div v-if="error" class="login-error animate-in">
          <span>⚠️</span> {{ error }}
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="login-form">
          <div class="input-group">
            <label class="input-label">Username</label>
            <div class="input-wrapper">
              <span class="input-icon">👤</span>
              <input
                type="text"
                v-model="username"
                class="login-input"
                placeholder="Enter username"
                autocomplete="username"
              />
            </div>
          </div>

          <div class="input-group">
            <label class="input-label">Password</label>
            <div class="input-wrapper">
              <span class="input-icon">🔒</span>
              <input
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                class="login-input"
                placeholder="Enter password"
                autocomplete="current-password"
              />
              <button type="button" @click="showPassword = !showPassword" class="input-eye">
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>

          <button type="submit" class="login-btn" :disabled="loading">
            <span v-if="loading" class="login-spinner"></span>
            <span v-else>Sign In</span>
          </button>
        </form>

        <!-- Demo Credentials -->
        <div v-if="showDemoCredentials" class="demo-section">
          <button @click="showDemoExpanded = !showDemoExpanded" class="demo-toggle">
            <span>🔑 Demo Credentials</span>
            <span class="demo-chevron" :style="{transform: showDemoExpanded ? 'rotate(180deg)' : ''}">▾</span>
          </button>
          <div v-if="showDemoExpanded" class="demo-list animate-in">
            <button @click="fillDemo('admin', 'admin123')" class="demo-item">
              <span class="demo-badge demo-badge-admin">Admin</span>
              <span class="demo-creds">admin / admin123</span>
            </button>
            <button @click="fillDemo('operator', 'operator123')" class="demo-item">
              <span class="demo-badge demo-badge-op">Operator</span>
              <span class="demo-creds">operator / operator123</span>
            </button>
            <button @click="fillDemo('user', 'user123')" class="demo-item">
              <span class="demo-badge demo-badge-user">User</span>
              <span class="demo-creds">user / user123</span>
            </button>
          </div>
        </div>
      </div>

      <p class="login-footer">© 2025 University COMP Department</p>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  props: {
    onLogin: { type: Function, required: true },
    darkMode: { type: Boolean, default: true },
  },
  emits: ['toggle-theme'],
  setup(props) {
    const username = ref('')
    const password = ref('')
    const error = ref('')
    const showDemoCredentials = ref(true)
    const showDemoExpanded = ref(false)
    const showPassword = ref(false)
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

    const fillDemo = (u, p) => {
      username.value = u
      password.value = p
    }

    return {
      username,
      password,
      error,
      showDemoCredentials,
      showDemoExpanded,
      showPassword,
      loading,
      handleSubmit,
      fillDemo,
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: var(--bg-primary);
  padding: 1rem;
}

/* ===== Animated Background Orbs ===== */
.login-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
}

.login-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  animation: orbFloat 8s ease-in-out infinite;
}

.login-orb-1 {
  width: 300px; height: 300px;
  background: #0699ff;
  top: -80px; left: -60px;
  animation-delay: 0s;
}
.login-orb-2 {
  width: 250px; height: 250px;
  background: #a855f7;
  bottom: -60px; right: -40px;
  animation-delay: 2s;
}
.login-orb-3 {
  width: 200px; height: 200px;
  background: #06b6d4;
  top: 50%; left: 60%;
  animation-delay: 4s;
}

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -20px) scale(1.05); }
  66% { transform: translate(-20px, 15px) scale(0.95); }
}

/* ===== Theme Toggle ===== */
.theme-toggle-login {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-glass);
  backdrop-filter: blur(12px);
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}
.theme-toggle-login:active {
  transform: scale(0.9);
}

/* ===== Login Container ===== */
.login-container {
  width: 100%;
  max-width: 24rem;
  z-index: 1;
}

.login-card {
  background: var(--bg-glass);
  backdrop-filter: blur(24px) saturate(1.5);
  -webkit-backdrop-filter: blur(24px) saturate(1.5);
  border: 1px solid var(--border-glass);
  border-radius: 1.5rem;
  padding: 2rem 1.5rem;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
}

@media (min-width: 640px) {
  .login-card {
    padding: 2.5rem 2rem;
  }
}

/* ===== Login Header ===== */
.login-header {
  text-align: center;
  margin-bottom: 1.75rem;
}

.login-logo {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  animation: logoPulse 3s ease-in-out infinite;
}

@keyframes logoPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.login-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.login-subtitle {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

/* ===== Error ===== */
.login-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.75rem;
  color: #fca5a5;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.light-mode .login-error {
  color: #dc2626;
  background: rgba(239, 68, 68, 0.08);
}

/* ===== Form ===== */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.input-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: var(--bg-tertiary);
  border: 1.5px solid var(--border-color);
  border-radius: 0.75rem;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-wrapper:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.input-icon {
  padding: 0 0.75rem;
  font-size: 1rem;
  flex-shrink: 0;
}

.login-input {
  flex: 1;
  padding: 0.75rem 0.75rem 0.75rem 0;
  font-size: 1rem;
  color: var(--text-primary);
  background: transparent;
  border: none;
  outline: none;
  min-width: 0;
}

.login-input::placeholder {
  color: var(--text-muted);
}

.input-eye {
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  background: none;
  border: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

/* ===== Login Button ===== */
.login-btn {
  width: 100%;
  padding: 0.875rem;
  margin-top: 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #0699ff, #0080ff);
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-btn:hover {
  box-shadow: 0 0 24px rgba(6, 153, 255, 0.4);
  filter: brightness(1.08);
}

.login-btn:active {
  transform: scale(0.98);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== Demo Section ===== */
.demo-section {
  margin-top: 1.5rem;
}

.demo-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  color: var(--text-secondary);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.demo-chevron {
  transition: transform 0.2s;
  font-size: 0.75rem;
}

.demo-list {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.demo-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 0.625rem;
  cursor: pointer;
  border: none;
  width: 100%;
  text-align: left;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.demo-item:active {
  background: var(--accent-glow);
}

.demo-badge {
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 700;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.demo-badge-admin { background: rgba(239, 68, 68, 0.15); color: #f87171; }
.demo-badge-op { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
.demo-badge-user { background: rgba(34, 197, 94, 0.15); color: #4ade80; }

.light-mode .demo-badge-admin { color: #dc2626; }
.light-mode .demo-badge-op { color: #d97706; }
.light-mode .demo-badge-user { color: #16a34a; }

.demo-creds {
  font-size: 0.8125rem;
  color: var(--text-muted);
  font-family: 'SF Mono', 'Fira Code', monospace;
}

/* ===== Footer ===== */
.login-footer {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.animate-in {
  animation: fadeInUp 0.3s ease-out both;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
