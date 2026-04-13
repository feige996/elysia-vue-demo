<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NButton,
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NLayoutSider,
  NMenu,
  NSpace,
  NText,
  type MenuOption,
} from 'naive-ui';
import { useRoute, useRouter } from 'vue-router';
import type { MenuTreeEntity } from '../../../api/src/shared/types/entities';
import { useAuthStore } from '../store/auth';
import { useUiStore } from '../store/ui';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const collapsed = ref(false);
const uiStore = useUiStore();

const welcomeText = computed(() =>
  authStore.profile ? `欢迎你，${authStore.profile.name}` : '未登录',
);

const mapMenuTreeToOptions = (tree: MenuTreeEntity[]): MenuOption[] =>
  tree
    .filter((item) => item.type !== 3)
    .map((item) => ({
      key: item.path,
      label: item.name,
      children: item.children.length
        ? mapMenuTreeToOptions(item.children)
        : undefined,
    }));

const menuOptions = computed(() => mapMenuTreeToOptions(authStore.menuTree));
const selectedMenuKey = computed<string | null>(() =>
  typeof route.path === 'string' ? route.path : null,
);

const onMenuSelect = (key: string) => {
  void router.push(key);
};

const logout = () => {
  authStore.clearAuthState();
  void router.replace('/login');
};
</script>

<template>
  <NLayout class="layout">
    <NLayoutHeader bordered class="header">
      <NSpace justify="space-between" align="center">
        <NText strong>Admin Console</NText>
        <NSpace align="center">
          <NText>{{ welcomeText }}</NText>
          <NButton tertiary @click="collapsed = !collapsed">折叠菜单</NButton>
          <NButton tertiary @click="uiStore.toggleThemeMode">{{
            uiStore.isDarkMode ? '浅色模式' : '暗黑模式'
          }}</NButton>
          <NButton tertiary @click="uiStore.setPrimaryColor('#18a058')"
            >绿色主题</NButton
          >
          <NButton tertiary @click="uiStore.setPrimaryColor('#2080f0')"
            >蓝色主题</NButton
          >
          <NButton tertiary type="error" @click="logout">退出</NButton>
        </NSpace>
      </NSpace>
    </NLayoutHeader>
    <NLayout has-sider class="main">
      <NLayoutSider
        bordered
        collapse-mode="width"
        :collapsed="collapsed"
        :collapsed-width="64"
        :width="220"
      >
        <NMenu
          :value="selectedMenuKey ?? undefined"
          :options="menuOptions"
          :collapsed="collapsed"
          @update:value="onMenuSelect"
        />
      </NLayoutSider>
      <NLayoutContent class="content">
        <RouterView />
      </NLayoutContent>
    </NLayout>
  </NLayout>
</template>

<style scoped>
.layout {
  min-height: 100vh;
}

.main {
  min-height: calc(100vh - 56px);
}

.header {
  padding: 14px 20px;
  background: #fff;
}

.content {
  margin: 24px;
}
</style>
