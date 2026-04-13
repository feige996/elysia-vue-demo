<script setup lang="ts">
import { ref } from 'vue';
import { NCard, NSpin, NText } from 'naive-ui';
import { useRouter } from 'vue-router';
import Login from './Login.vue';
import type { LoginResult } from '../api/modules/auth';
import { useAuthStore } from '../store/auth';
import { ensureAuthDynamicRoutes } from '../router';
import { ApiRequestError } from '../../../shared/request/eden';

const authStore = useAuthStore();
const router = useRouter();
const loading = ref(false);
const errorText = ref('');

const onLoginSuccess = async (payload: LoginResult) => {
  errorText.value = '';
  loading.value = true;
  try {
    authStore.applyLoginResult(payload);
    await authStore.bootstrapAuthContext();
    ensureAuthDynamicRoutes(authStore.menuTree);
    await router.replace('/system/user');
  } catch (error) {
    authStore.clearAuthState();
    if (error instanceof ApiRequestError) {
      if (error.code === 401000) {
        errorText.value = '登录状态已失效，请重新登录';
        return;
      }
      if (error.code === 403000) {
        errorText.value = '当前账号无后台访问权限';
        return;
      }
    }
    errorText.value = error instanceof Error ? error.message : '初始化登录上下文失败';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-page">
    <NCard title="后台登录" :bordered="false" class="login-card">
      <NSpin :show="loading">
        <Login @login-success="onLoginSuccess" />
      </NSpin>
      <NText v-if="errorText" type="error">{{ errorText }}</NText>
    </NCard>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.login-card {
  width: 420px;
}
</style>
