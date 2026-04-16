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

const DEMO_PARENT_KEY = '/demo';
const DEMO_DEFAULT_CHILD_KEY = '/demo/charts';
const DEMO_RICH_TEXT_CHILD_KEY = '/demo/rich-text';

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

const hasOptionKeyDeep = (options: MenuOption[], key: string): boolean => {
  for (const opt of options) {
    if (opt.key === key) return true;
    if (opt.children?.length) {
      if (hasOptionKeyDeep(opt.children, key)) return true;
    }
  }
  return false;
};

const removeKeysDeep = (
  options: MenuOption[],
  keys: Set<string>,
): MenuOption[] => {
  return options
    .map((opt) => {
      const optionKey = typeof opt.key === 'string' ? opt.key : '';
      if (keys.has(optionKey)) return null;
      const children: MenuOption[] | undefined = opt.children?.length
        ? removeKeysDeep(opt.children, keys)
        : undefined;
      if (children?.length) {
        return {
          ...opt,
          children,
        };
      }
      return {
        ...opt,
        children: undefined,
      };
    })
    .filter((v): v is MenuOption => Boolean(v));
};

const menuOptions = computed(() => {
  const baseOptions = mapMenuTreeToOptions(authStore.menuTree);

  // 如果后端已经配置了“示例页”父级，优先使用后端结构
  if (hasOptionKeyDeep(baseOptions, DEMO_PARENT_KEY)) {
    return baseOptions;
  }

  // 将 demo 子项从原位置剥离，统一归到“示例页”下
  const strippedOptions = removeKeysDeep(
    baseOptions,
    new Set(['/demo/table-ops', '/demo/charts', DEMO_RICH_TEXT_CHILD_KEY]),
  );

  return [
    ...strippedOptions,
    {
      key: DEMO_PARENT_KEY,
      label: '示例页',
      children: [
        { key: '/demo/charts', label: '图表能力演示' },
        { key: '/demo/table-ops', label: '表格能力演示' },
        { key: DEMO_RICH_TEXT_CHILD_KEY, label: '富文本能力演示' },
      ],
    },
  ];
});
const selectedMenuKey = computed<string | null>(() =>
  typeof route.path === 'string' ? route.path : null,
);

const onMenuSelect = (key: string) => {
  if (key === DEMO_PARENT_KEY) {
    void router.push(DEMO_DEFAULT_CHILD_KEY);
    return;
  }
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
        <NText strong>Harbor Admin</NText>
        <NSpace align="center">
          <NText>{{ welcomeText }}</NText>
          <NButton tertiary @click="router.push('/system/user-center')"
            >个人中心</NButton
          >
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
        <div class="router-view-host">
          <RouterView />
        </div>
      </NLayoutContent>
    </NLayout>
  </NLayout>
</template>

<style scoped>
/* 固定为视口高度，避免整页（含侧栏）跟表格一起滚动；主区与侧栏各自滚动 */
.layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.layout > :deep(.n-layout-scroll-container) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  flex-shrink: 0;
  padding: 14px 20px;
}

.main {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.main > :deep(.n-layout-scroll-container) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.content {
  /* 用 padding 替代 margin，避免 flex 子项外边距把总高度撑出视口而出现双滚动条 */
  padding: 24px;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.content :deep(> .n-layout-scroll-container) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* 让子页面可用 height:100% / flex 填满主区，避免用 100dvh 估算与真实槽位不一致导致双滚动条 */
.content :deep(.router-view-host) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
}
</style>
