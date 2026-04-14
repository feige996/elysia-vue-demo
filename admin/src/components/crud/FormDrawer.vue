<script setup lang="ts">
import { NButton, NDrawer, NDrawerContent, NSpace } from 'naive-ui';

type Props = {
  show: boolean;
  title: string;
  width?: number;
  loading?: boolean;
  saveText?: string;
  cancelText?: string;
};

const props = withDefaults(defineProps<Props>(), {
  width: 520,
  loading: false,
  saveText: '保存',
  cancelText: '取消',
});

const emit = defineEmits<{
  'update:show': [value: boolean];
  save: [];
  cancel: [];
}>();

const close = () => {
  emit('update:show', false);
  emit('cancel');
};

const onSave = () => emit('save');
</script>

<template>
  <NDrawer
    :show="props.show"
    :width="props.width"
    @update:show="(value) => emit('update:show', value)"
  >
    <NDrawerContent :title="props.title" closable @close="close">
      <slot />
      <template #footer>
        <NSpace justify="end">
          <NButton @click="close">{{ props.cancelText }}</NButton>
          <NButton type="primary" :loading="props.loading" @click="onSave">
            {{ props.saveText }}
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
