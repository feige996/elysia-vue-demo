<script setup lang="ts">
import { NEmpty, NResult, NSpin } from 'naive-ui';

type Props = {
  loading?: boolean;
  errorText?: string;
  empty?: boolean;
  emptyDescription?: string;
};

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  errorText: '',
  empty: false,
  emptyDescription: '暂无数据',
});
</script>

<template>
  <NSpin :show="props.loading">
    <NResult
      v-if="!props.loading && props.errorText"
      status="error"
      title="加载失败"
      :description="props.errorText"
    />
    <NEmpty
      v-else-if="!props.loading && props.empty"
      :description="props.emptyDescription"
    />
    <slot v-else />
  </NSpin>
</template>
