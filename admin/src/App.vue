<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NButton,
  NConfigProvider,
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NSpace,
  NText,
} from 'naive-ui';
import Login from './views/Login.vue';
import UserManagement from './views/UserManagement.vue';
import { clearAccessToken, clearRefreshToken } from './api/request';
import type { LoginResult } from './api/modules/auth';

const profile = ref<LoginResult['user'] | null>(null);

const welcomeText = computed(() =>
  profile.value ? `欢迎你，${profile.value.name}` : '未登录',
);

const onLoginSuccess = (payload: LoginResult) => {
  profile.value = payload.user;
};

const logout = () => {
  clearAccessToken();
  clearRefreshToken();
  profile.value = null;
};
</script>

<template>
  <NConfigProvider>
    <NLayout class="layout">
      <NLayoutHeader bordered class="header">
        <NSpace justify="space-between" align="center">
          <NText strong>Admin Console</NText>
          <NSpace align="center">
            <NText>{{ welcomeText }}</NText>
            <NButton v-if="profile" tertiary type="error" @click="logout"
              >退出</NButton
            >
          </NSpace>
        </NSpace>
      </NLayoutHeader>
      <NLayoutContent class="content">
        <Login v-if="!profile" @login-success="onLoginSuccess" />
        <UserManagement v-else />
      </NLayoutContent>
    </NLayout>
  </NConfigProvider>
</template>

<style scoped>
.layout {
  min-height: 100vh;
}

.header {
  padding: 14px 20px;
  background: #fff;
}

.content {
  max-width: 1080px;
  margin: 24px auto;
  padding: 0 16px;
}
</style>
