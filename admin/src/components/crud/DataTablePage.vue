<script setup lang="ts">
import {
  NCard,
  NDataTable,
  NSpace,
  type DataTableColumns,
  type DataTableProps,
  type DataTableRowKey,
  type PaginationProps,
} from 'naive-ui';
import TableToolbar from './TableToolbar.vue';
import UnifiedState from '../state/UnifiedState.vue';

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
  rowSelection?: {
    checkedRowKeys?: DataTableRowKey[];
    onUpdateCheckedRowKeys?: (keys: DataTableRowKey[]) => void;
  };
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
          :pagination="props.pagination"
          :row-key="props.rowKey"
          :row-selection="props.rowSelection"
        />
      </UnifiedState>
    </NSpace>
  </NCard>
</template>
