import { ref } from 'vue';
import { authService } from '../utils/services';

const user = ref(null);
const isAuthenticated = ref(false);
const isAuthLoading = ref(true);

export const useAuth = () => {
  const initAuth = async () => {
    if (user.value) {
      isAuthLoading.value = false;
      return;
    }

    const token = sessionStorage.getItem('token');
    if (!token) {
      isAuthLoading.value = false;
      return;
    }

    try {
      const restored = await authService.restoreSession();
      if (restored) {
        user.value = restored;
        isAuthenticated.value = true;
      } else {
        user.value = null;
        isAuthenticated.value = false;
      }
    } catch (e) {
      user.value = null;
      isAuthenticated.value = false;
    } finally {
      isAuthLoading.value = false;
    }
  };

  const login = async (username, password) => {
    isAuthLoading.value = true;
    try {
      const loggedInUser = await authService.login(username, password);
      if (loggedInUser) {
        user.value = loggedInUser;
        isAuthenticated.value = true;
        return true;
      }
      return false;
    } finally {
      isAuthLoading.value = false;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      user.value = null;
      isAuthenticated.value = false;
    }
  };

  return { user, isAuthenticated, isAuthLoading, login, logout, initAuth };
};
