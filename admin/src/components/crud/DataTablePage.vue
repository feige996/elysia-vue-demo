<script setup lang="ts">
import { computed, useSlots } from 'vue';
import {
  NCard,
  NDataTable,
  type DataTableColumns,
  type DataTableProps,
  type PaginationProps,
} from 'naive-ui';
import TableToolbar from './TableToolbar.vue';
import UnifiedState from '../state/UnifiedState.vue';
import { buildTablePaginationPrefix } from './tablePaginationPrefix';

type Props = {
  title: string;
  loading?: boolean;
  errorText?: string;
  empty?: boolean;
  emptyDescription?: string;
  columns: DataTableColumns<any>;
  data: Record<string, unknown>[];
  pagination?: false | PaginationProps;
  rowKey?: NonNullable<DataTableProps['rowKey']>;
  tableProps?: Partial<DataTableProps>;
  bordered?: boolean;
  /**
   * fill：单表尽量占满主内容可视高度（默认）。
   * compact：表格下方还有大块内容（如仪表盘统计卡、缓存采样卡）时用较小 max-height。
   */
  tableLayout?: 'fill' | 'compact';
};

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  errorText: '',
  empty: false,
  emptyDescription: '暂无数据',
  pagination: false,
  bordered: false,
  tableLayout: 'fill',
});

/** 为所有启用分页的表格统一补充总数摘要与快速跳转，各页仍可通过传入字段覆盖 */
const mergedPagination = computed<false | PaginationProps>(() => {
  if (props.pagination === false) {
    return false;
  }
  const p = props.pagination;
  return {
    ...p,
    showQuickJumper: p.showQuickJumper ?? true,
    prefix: p.prefix ?? buildTablePaginationPrefix(),
  };
});

/**
 * 表体 max-height：必须小于「主内容槽」高度，否则会整卡超高，出现布局层滚动条且分页被挤出视口。
 * 扣减项含顶栏、主区 padding、卡片头、工具栏、表头、分页、间距等（偏保守）。
 */
const defaultTableMaxHeight = computed(() =>
  props.tableLayout === 'compact'
    ? 'max(200px, min(360px, calc(100dvh - 560px)))'
    : 'max(220px, calc(100dvh - 330px))',
);

const bodyFillClass = computed(() =>
  props.tableLayout === 'fill' ? 'data-table-page-body--fill' : '',
);
const slots = useSlots();
const hasAfterSlot = computed(() => Boolean(slots.default));

const mergedTableProps = computed<Partial<DataTableProps>>(() => {
  const from = props.tableProps ?? {};
  const out: Partial<DataTableProps> = { ...from };
  if (from.striped === undefined) {
    out.striped = true;
  }
  if (from.maxHeight === undefined) {
    out.maxHeight = defaultTableMaxHeight.value;
  }
  return out;
});
</script>

<template>
  <div class="data-table-page-root">
    <NCard
      :title="props.title"
      :bordered="props.bordered"
      class="data-table-page-card"
    >
      <div class="data-table-page-stack">
        <TableToolbar class="data-table-page-toolbar">
          <template #left>
            <slot name="toolbar-left" />
          </template>
          <template #right>
            <slot name="toolbar-right" />
          </template>
        </TableToolbar>
        <UnifiedState
          class="data-table-page-body"
          :class="bodyFillClass"
          :loading="props.loading"
          :error-text="props.errorText"
          :empty="props.empty"
          :empty-description="props.emptyDescription"
        >
          <NDataTable
            :columns="props.columns"
            :data="props.data"
            v-bind="mergedTableProps"
            :loading="props.loading"
            :pagination="mergedPagination"
            :row-key="props.rowKey"
          />
        </UnifiedState>
        <div v-if="hasAfterSlot" class="data-table-page-after">
          <slot />
        </div>
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.data-table-page-root {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.data-table-page-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.data-table-page-card :deep(.n-card-header) {
  flex-shrink: 0;
}

.data-table-page-card :deep(.n-card-content) {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.data-table-page-stack {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.data-table-page-toolbar {
  flex-shrink: 0;
}

.data-table-page-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.data-table-page-body--fill {
  flex: 1;
  min-height: 0;
}

.data-table-page-body:not(.data-table-page-body--fill) {
  flex: 0 0 auto;
  min-height: 0;
}

.data-table-page-after {
  flex-shrink: 0;
}

.data-table-page-body :deep(.n-spin-container) {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.data-table-page-body :deep(.n-spin-content) {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
