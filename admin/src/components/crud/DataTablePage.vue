<script setup lang="ts">
import { computed } from 'vue';
import {
  NCard,
  NDataTable,
  NSpace,
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
};

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  errorText: '',
  empty: false,
  emptyDescription: '暂无数据',
  pagination: false,
  bordered: false,
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
</script>

<template>
  <NCard :title="props.title" :bordered="props.bordered">
    <NSpace vertical :size="12">
      <TableToolbar>
        <template #left>
          <slot name="toolbar-left" />
        </template>
        <template #right>
          <slot name="toolbar-right" />
        </template>
      </TableToolbar>
      <UnifiedState
        :loading="props.loading"
        :error-text="props.errorText"
        :empty="props.empty"
        :empty-description="props.emptyDescription"
      >
        <NDataTable
          :columns="props.columns"
          :data="props.data"
          v-bind="props.tableProps"
          :loading="props.loading"
          :pagination="mergedPagination"
          :row-key="props.rowKey"
        />
      </UnifiedState>
      <slot />
    </NSpace>
  </NCard>
</template>
