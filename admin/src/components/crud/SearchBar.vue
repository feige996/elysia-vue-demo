<script setup lang="ts">
import { NSpace } from 'naive-ui';

type Props = {
  collapsed?: boolean;
};

withDefaults(defineProps<Props>(), {
  collapsed: false,
});
</script>

<template>
  <NSpace align="center" :size="12" :wrap-item="!collapsed">
    <slot />
  </NSpace>
</template>
