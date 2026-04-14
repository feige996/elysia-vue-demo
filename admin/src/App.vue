<script setup lang="ts">
import {
  NConfigProvider,
  NDialogProvider,
  NMessageProvider,
  darkTheme,
} from 'naive-ui';
import { computed } from 'vue';
import { useUiStore } from './store/ui';

const uiStore = useUiStore();
const theme = computed(() => (uiStore.isDarkMode ? darkTheme : null));
const themeOverrides = computed(() => ({
  common: {
    primaryColor: uiStore.primaryColor,
    primaryColorHover: uiStore.primaryColor,
    primaryColorPressed: uiStore.primaryColor,
    primaryColorSuppl: uiStore.primaryColor,
  },
}));
</script>

<template>
  <NConfigProvider :theme="theme" :theme-overrides="themeOverrides">
    <NMessageProvider>
      <NDialogProvider>
        <RouterView />
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
