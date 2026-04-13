import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { MenuTreeEntity } from '../../../api/src/shared/types/entities';
import type { LoginResult } from '../api/modules/auth';
import { getCurrentMenuTreeMethod } from '../api/modules/menu';
import { getCurrentPermissionCodesMethod } from '../api/modules/permission';
import {
  clearAccessToken,
  clearRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '../api/request';

const ADMIN_PROFILE_KEY = 'admin_profile';

export const useAuthStore = defineStore('auth', () => {
  const profile = ref<LoginResult['user'] | null>(null);
  const permissionCodes = ref<string[]>([]);
  const menuTree = ref<MenuTreeEntity[]>([]);
  const initialized = ref(false);
  let bootstrapPromise: Promise<void> | null = null;

  const isLoggedIn = computed(() => profile.value !== null);

  const hasPermission = (permissionCode: string) =>
    permissionCodes.value.includes(permissionCode);

  const applyLoginResult = (payload: LoginResult) => {
    setAccessToken(payload.accessToken);
    setRefreshToken(payload.refreshToken);
    profile.value = payload.user;
    localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(payload.user));
    initialized.value = false;
  };

  const bootstrapAuthContext = async () => {
    if (initialized.value) return;
    if (!bootstrapPromise) {
      bootstrapPromise = (async () => {
        const [permissionResponse, menuResponse] = await Promise.all([
          getCurrentPermissionCodesMethod(),
          getCurrentMenuTreeMethod(),
        ]);
        permissionCodes.value = permissionResponse.data;
        menuTree.value = menuResponse.data;
        initialized.value = true;
      })().finally(() => {
        bootstrapPromise = null;
      });
    }
    await bootstrapPromise;
  };

  const clearAuthState = () => {
    clearAccessToken();
    clearRefreshToken();
    profile.value = null;
    permissionCodes.value = [];
    menuTree.value = [];
    localStorage.removeItem(ADMIN_PROFILE_KEY);
    initialized.value = false;
    bootstrapPromise = null;
  };

  const restoreProfile = () => {
    if (profile.value) return;
    const raw = localStorage.getItem(ADMIN_PROFILE_KEY);
    if (!raw) return;
    try {
      profile.value = JSON.parse(raw) as LoginResult['user'];
    } catch {
      localStorage.removeItem(ADMIN_PROFILE_KEY);
    }
  };

  return {
    profile,
    permissionCodes,
    menuTree,
    initialized,
    isLoggedIn,
    hasPermission,
    applyLoginResult,
    bootstrapAuthContext,
    clearAuthState,
    restoreProfile,
  };
});
