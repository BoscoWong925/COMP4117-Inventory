import { ref } from 'vue';
import { authService } from '../utils/services';

export const useAuth = () => {
  const user = ref(authService.getCurrentUser());
  const isAuthenticated = ref(!!authService.getCurrentUser());

  const login = async (username, password) => {
    const loggedInUser = await authService.login(username, password);
    if (loggedInUser) {
      user.value = loggedInUser;
      isAuthenticated.value = true;
      return true;
    }
    return false;
  };

  const logout = async () => {
    await authService.logout();
    user.value = null;
    isAuthenticated.value = false;
  };

  return { user, isAuthenticated, login, logout };
};
