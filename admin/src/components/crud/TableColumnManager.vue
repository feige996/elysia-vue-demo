<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  NButton,
  NCheckbox,
  NCheckboxGroup,
  NDivider,
  NPopover,
  NSpace,
  NTag,
  NText,
} from 'naive-ui';

export type TableColumnManagerItem = {
  id: string;
  label: string;
  hideable?: boolean;
};

type Props = {
  items: TableColumnManagerItem[];
  storageKey: string;
  buttonText?: string;
};

const props = withDefaults(defineProps<Props>(), {
  buttonText: '列管理',
});

const emit = defineEmits<{
  change: [payload: { order: string[]; visible: string[] }];
}>();

const order = ref<string[]>([]);
const visible = ref<string[]>([]);
const draggingId = ref<string | null>(null);

const hideableItems = computed(() =>
  props.items.filter((item) => item.hideable !== false),
);
const orderedItems = computed(() =>
  order.value
    .map((id) => props.items.find((item) => item.id === id))
    .filter((item): item is TableColumnManagerItem => Boolean(item)),
);

const buildDefaults = () => ({
  order: props.items.map((item) => item.id),
  visible: hideableItems.value.map((item) => item.id),
});

const persist = () => {
  const payload = {
    order: order.value,
    visible: visible.value,
  };
  localStorage.setItem(props.storageKey, JSON.stringify(payload));
};

const emitChange = () => {
  emit('change', {
    order: [...order.value],
    visible: [...visible.value],
  });
};

const restore = () => {
  const defaults = buildDefaults();
  let nextOrder = [...defaults.order];
  let nextVisible = [...defaults.visible];
  const raw = localStorage.getItem(props.storageKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as {
        order?: unknown;
        visible?: unknown;
      };
      if (Array.isArray(parsed.order)) {
        const restored = parsed.order.filter((id): id is string =>
          defaults.order.includes(String(id)),
        );
        const missing = defaults.order.filter((id) => !restored.includes(id));
        nextOrder = [...restored, ...missing];
      }
      if (Array.isArray(parsed.visible)) {
        nextVisible = parsed.visible.filter((id): id is string =>
          defaults.visible.includes(String(id)),
        );
      }
    } catch {
      // ignore corrupted local storage
    }
  }
  order.value = nextOrder;
  visible.value = nextVisible;
  emitChange();
};

watch(
  () => [props.items, props.storageKey] as const,
  () => restore(),
  { immediate: true, deep: true },
);

const onVisibleUpdate = (values: Array<string | number>) => {
  visible.value = values
    .map((value) => String(value))
    .filter((id) => hideableItems.value.some((item) => item.id === id));
  persist();
  emitChange();
};

const onDragStart = (id: string) => {
  draggingId.value = id;
};

const onDropTo = (targetId: string) => {
  const sourceId = draggingId.value;
  draggingId.value = null;
  if (!sourceId || sourceId === targetId) return;
  const next = [...order.value];
  const fromIndex = next.indexOf(sourceId);
  const toIndex = next.indexOf(targetId);
  if (fromIndex < 0 || toIndex < 0) return;
  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, sourceId);
  order.value = next;
  persist();
  emitChange();
};

const reset = () => {
  const defaults = buildDefaults();
  order.value = defaults.order;
  visible.value = defaults.visible;
  persist();
  emitChange();
};
</script>

<template>
  <NPopover trigger="click" placement="bottom-end" style="max-width: 360px">
    <template #trigger>
      <NButton secondary>{{ props.buttonText }}</NButton>
    </template>
    <NSpace vertical :size="10">
      <NText strong>显示/隐藏列</NText>
      <NCheckboxGroup :value="visible" @update:value="onVisibleUpdate">
        <NSpace wrap>
          <NCheckbox
            v-for="item in hideableItems"
            :key="item.id"
            :value="item.id"
          >
            {{ item.label }}
          </NCheckbox>
        </NSpace>
      </NCheckboxGroup>
      <NDivider style="margin: 4px 0" />
      <NText strong>列顺序拖拽（按显示顺序）</NText>
      <div class="column-order-list">
        <div
          v-for="item in orderedItems"
          :key="item.id"
          class="column-order-item"
          draggable="true"
          @dragstart="onDragStart(item.id)"
          @dragover.prevent
          @drop="onDropTo(item.id)"
        >
          <span class="drag-handle">::</span>
          <span>{{ item.label }}</span>
          <NTag v-if="item.hideable === false" size="small">固定</NTag>
        </div>
      </div>
      <NSpace justify="end">
        <NButton quaternary size="small" @click="reset">重置列配置</NButton>
      </NSpace>
    </NSpace>
  </NPopover>
</template>

<style scoped>
.column-order-list {
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid rgba(128, 128, 128, 0.25);
  border-radius: 8px;
  padding: 8px;
}

.column-order-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: move;
}

.column-order-item:hover {
  background: rgba(128, 128, 128, 0.12);
}

.drag-handle {
  opacity: 0.7;
  font-family: monospace;
}
</style>
