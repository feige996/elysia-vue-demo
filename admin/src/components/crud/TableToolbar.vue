<script setup lang="ts">
import { NSpace } from 'naive-ui';
</script>

<template>
  <NSpace justify="space-between" align="center" :wrap-item="false">
    <NSpace align="center" :size="8">
      <slot name="left" />
    </NSpace>
    <NSpace align="center" :size="8">
      <slot name="right" />
    </NSpace>
  </NSpace>
</template>
