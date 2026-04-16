<script setup lang="ts">
import { computed, h, ref } from 'vue';
import {
  NButton,
  NInput,
  NPopconfirm,
  NSelect,
  NSpace,
  NTag,
  NText,
  useDialog,
  useMessage,
  type DataTableColumns,
  type DataTableRowKey,
} from 'naive-ui';
import DataTablePage from '../components/crud/DataTablePage.vue';
import SearchBar from '../components/crud/SearchBar.vue';
import TableColumnManager, {
  type TableColumnManagerItem,
} from '../components/crud/TableColumnManager.vue';

type DemoStatus = 'enabled' | 'disabled' | 'draft';
type DemoRow = {
  id: number;
  code: string;
  name: string;
  owner: string;
  endpoint: string;
  status: DemoStatus;
  updatedAt: string;
  description: string;
};
type ColumnId =
  | 'selection'
  | 'code'
  | 'name'
  | 'owner'
  | 'endpoint'
  | 'status'
  | 'updatedAt'
  | 'description'
  | 'actions';
const message = useMessage();
const dialog = useDialog();
const COLUMN_PREFS_KEY = 'table-ops-demo:column-manager:v1';
const loading = ref(false);
const errorText = ref('');
const showEmpty = ref(false);
const checkedRowKeys = ref<DataTableRowKey[]>([]);
const page = ref(1);
const pageSize = ref(10);
const keyword = ref('');
const ownerValue = ref<'all' | string>('all');
const statusValue = ref<'all' | DemoStatus>('all');
const sortValue = ref<'updatedDesc' | 'updatedAsc' | 'nameAsc'>('updatedDesc');
const deleteConfirmMode = ref<'popover' | 'dialog'>('popover');

const ownerOptions = [
  { label: '全部负责人', value: 'all' },
  { label: 'alice', value: 'alice' },
  { label: 'bob', value: 'bob' },
  { label: 'carol', value: 'carol' },
];
const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '启用', value: 'enabled' },
  { label: '禁用', value: 'disabled' },
  { label: '草稿', value: 'draft' },
];
const sortOptions = [
  { label: '更新时间: 新 -> 旧', value: 'updatedDesc' },
  { label: '更新时间: 旧 -> 新', value: 'updatedAsc' },
  { label: '名称: A -> Z', value: 'nameAsc' },
];
const deleteConfirmModeOptions = [
  { label: '删除确认: Popconfirm', value: 'popover' },
  { label: '删除确认: Dialog', value: 'dialog' },
];

const createRows = (): DemoRow[] =>
  Array.from({ length: 57 }, (_item, index) => {
    const id = index + 1;
    const status: DemoStatus =
      id % 3 === 0 ? 'disabled' : id % 5 === 0 ? 'draft' : 'enabled';
    const owner = id % 3 === 0 ? 'alice' : id % 3 === 1 ? 'bob' : 'carol';
    const day = String((id % 28) + 1).padStart(2, '0');
    return {
      id,
      code: `demo:table:${id}`,
      name: `演示项-${String(id).padStart(3, '0')}`,
      owner,
      endpoint: `/api/demo/table/${id}`,
      status,
      updatedAt: `2026-04-${day} ${String((id % 23) + 1).padStart(2, '0')}:${String(
        (id * 3) % 59,
      ).padStart(2, '0')}:00`,
      description:
        id % 7 === 0
          ? '这是一段较长的描述文本，用于演示省略、tooltip 和复制等组合操作。'
          : `普通描述 ${id}`,
    };
  });

const rows = ref<DemoRow[]>(createRows());

const statusTagType = (status: DemoStatus) =>
  status === 'enabled'
    ? 'success'
    : status === 'disabled'
      ? 'error'
      : 'warning';

const filteredRows = computed(() => {
  if (showEmpty.value) return [];
  const text = keyword.value.trim().toLowerCase();
  return rows.value.filter((row) => {
    if (ownerValue.value !== 'all' && row.owner !== ownerValue.value)
      return false;
    if (statusValue.value !== 'all' && row.status !== statusValue.value)
      return false;
    if (!text) return true;
    return (
      row.code.toLowerCase().includes(text) ||
      row.name.toLowerCase().includes(text) ||
      row.endpoint.toLowerCase().includes(text)
    );
  });
});

const sortedRows = computed(() => {
  const list = [...filteredRows.value];
  if (sortValue.value === 'nameAsc') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortValue.value === 'updatedAsc') {
    list.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  } else {
    list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return list;
});

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return sortedRows.value.slice(start, end);
});

const pagination = computed(() => ({
  page: page.value,
  pageSize: pageSize.value,
  itemCount: sortedRows.value.length,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  onUpdatePage: (nextPage: number) => {
    page.value = nextPage;
  },
  onUpdatePageSize: (nextSize: number) => {
    pageSize.value = nextSize;
    page.value = 1;
  },
}));

const copyText = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    message.success('复制成功');
  } catch {
    message.error('复制失败，请检查浏览器权限');
  }
};

const toggleRowStatus = (row: DemoRow) => {
  row.status = row.status === 'enabled' ? 'disabled' : 'enabled';
  message.success(`已切换 ${row.name} 状态`);
};

const removeRow = (row: DemoRow) => {
  rows.value = rows.value.filter((item) => item.id !== row.id);
  checkedRowKeys.value = checkedRowKeys.value.filter((key) => key !== row.id);
  message.success(`已删除 ${row.name}`);
};

const confirmRemoveRow = (row: DemoRow) => {
  if (deleteConfirmMode.value === 'popover') {
    removeRow(row);
    return;
  }
  dialog.warning({
    title: '删除演示项',
    content: `确定删除「${row.name}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => removeRow(row),
  });
};

const batchToggle = () => {
  const idSet = new Set(checkedRowKeys.value.map((item) => Number(item)));
  rows.value = rows.value.map((row) =>
    idSet.has(row.id)
      ? { ...row, status: row.status === 'enabled' ? 'disabled' : 'enabled' }
      : row,
  );
  message.success(`已切换 ${idSet.size} 条状态`);
};

const batchDelete = () => {
  const idSet = new Set(checkedRowKeys.value.map((item) => Number(item)));
  rows.value = rows.value.filter((row) => !idSet.has(row.id));
  message.success(`已删除 ${idSet.size} 条`);
  checkedRowKeys.value = [];
};

const confirmBatchDelete = () => {
  if (deleteConfirmMode.value === 'popover') {
    batchDelete();
    return;
  }
  const count = checkedRowKeys.value.length;
  dialog.warning({
    title: '批量删除演示项',
    content: `确定删除已选 ${count} 条吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => batchDelete(),
  });
};

const exportCurrentCsv = () => {
  const headers = [
    'id',
    'code',
    'name',
    'owner',
    'endpoint',
    'status',
    'updatedAt',
  ];
  const lines = sortedRows.value.map((row) =>
    [
      row.id,
      row.code,
      row.name,
      row.owner,
      row.endpoint,
      row.status,
      row.updatedAt,
    ]
      .map((field) => `"${String(field).replaceAll('"', '""')}"`)
      .join(','),
  );
  const content = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'table-demo.csv';
  a.click();
  URL.revokeObjectURL(url);
  message.success('已导出 CSV');
};

const resetFilters = () => {
  keyword.value = '';
  ownerValue.value = 'all';
  statusValue.value = 'all';
  sortValue.value = 'updatedDesc';
  page.value = 1;
};

const columnRegistry: Record<ColumnId, DataTableColumns<DemoRow>[number]> = {
  selection: {
    type: 'selection',
    width: 48,
  },
  code: {
    title: '权限码',
    key: 'code',
    width: 180,
    render: (row) =>
      h(
        NSpace,
        { size: 6, align: 'center' },
        {
          default: () => [
            h(NText, null, { default: () => row.code }),
            h(
              NButton,
              {
                size: 'tiny',
                quaternary: true,
                onClick: () => void copyText(row.code),
              },
              { default: () => '复制' },
            ),
          ],
        },
      ),
  },
  name: { title: '名称', key: 'name', width: 150 },
  owner: { title: '负责人', key: 'owner', width: 90 },
  endpoint: {
    title: '接口',
    key: 'endpoint',
    minWidth: 170,
    ellipsis: { tooltip: true },
    render: (row) =>
      h(
        NSpace,
        { size: 6, align: 'center' },
        {
          default: () => [
            h(NText, { depth: 3 }, { default: () => row.endpoint }),
            h(
              NButton,
              {
                size: 'tiny',
                quaternary: true,
                onClick: () => void copyText(row.endpoint),
              },
              { default: () => '复制' },
            ),
          ],
        },
      ),
  },
  status: {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) =>
      h(
        NTag,
        {
          type: statusTagType(row.status),
          size: 'small',
        },
        {
          default: () =>
            row.status === 'enabled'
              ? '启用'
              : row.status === 'disabled'
                ? '禁用'
                : '草稿',
        },
      ),
  },
  updatedAt: { title: '更新时间', key: 'updatedAt', width: 170 },
  description: {
    title: '描述',
    key: 'description',
    ellipsis: { tooltip: true },
  },
  actions: {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row) =>
      h(
        NSpace,
        { size: 6 },
        {
          default: () => [
            h(
              NButton,
              {
                size: 'small',
                onClick: () => message.info(`模拟编辑：${row.name}`),
              },
              { default: () => '编辑' },
            ),
            h(
              NButton,
              {
                size: 'small',
                type: row.status === 'enabled' ? 'warning' : 'success',
                ghost: true,
                onClick: () => toggleRowStatus(row),
              },
              { default: () => (row.status === 'enabled' ? '禁用' : '启用') },
            ),
            h(
              NPopconfirm,
              {
                disabled: deleteConfirmMode.value !== 'popover',
                onPositiveClick: () => confirmRemoveRow(row),
              },
              {
                trigger: () =>
                  h(
                    NButton,
                    {
                      size: 'small',
                      type: 'error',
                      ghost: true,
                      onClick:
                        deleteConfirmMode.value === 'dialog'
                          ? () => confirmRemoveRow(row)
                          : undefined,
                    },
                    { default: () => '删除' },
                  ),
                default: () =>
                  deleteConfirmMode.value === 'popover'
                    ? '确认删除该行吗？'
                    : '当前为 Dialog 模式',
              },
            ),
          ],
        },
      ),
  },
};
const columnManagerItems: TableColumnManagerItem[] = [
  { id: 'selection', label: '勾选列', hideable: false },
  { id: 'code', label: '权限码', hideable: true },
  { id: 'name', label: '名称', hideable: true },
  { id: 'owner', label: '负责人', hideable: true },
  { id: 'endpoint', label: '接口', hideable: true },
  { id: 'status', label: '状态', hideable: true },
  { id: 'updatedAt', label: '更新时间', hideable: true },
  { id: 'description', label: '描述', hideable: true },
  { id: 'actions', label: '操作', hideable: true },
];
const defaultColumnOrder = columnManagerItems.map(
  (item) => item.id as ColumnId,
);
const columnOrder = ref<ColumnId[]>([...defaultColumnOrder]);
const visibleColumnIds = ref<ColumnId[]>(
  columnManagerItems
    .filter((item) => item.hideable !== false)
    .map((item) => item.id as ColumnId),
);

const appliedColumns = computed<DataTableColumns<DemoRow>>(() => {
  const visibleSet = new Set(visibleColumnIds.value);
  return columnOrder.value
    .filter((id) => {
      if (id === 'selection') return true;
      return visibleSet.has(id);
    })
    .map((id) => columnRegistry[id]);
});

const onColumnManagerChange = (payload: {
  order: string[];
  visible: string[];
}) => {
  const nextOrder = payload.order.filter((id): id is ColumnId =>
    defaultColumnOrder.includes(id as ColumnId),
  );
  const missing = defaultColumnOrder.filter((id) => !nextOrder.includes(id));
  columnOrder.value = [...nextOrder, ...missing];
  visibleColumnIds.value = payload.visible.filter((id): id is ColumnId =>
    columnManagerItems.some(
      (item) => item.hideable !== false && item.id === id,
    ),
  );
};

const tableProps = computed(() => ({
  checkedRowKeys: checkedRowKeys.value,
  onUpdateCheckedRowKeys: (keys: DataTableRowKey[]) => {
    checkedRowKeys.value = keys;
  },
}));

const rowKey = (row: DemoRow) => row.id;
</script>

<template>
  <DataTablePage
    title="Table 能力演示（纯前端）"
    :loading="loading"
    :error-text="errorText"
    :empty="showEmpty || sortedRows.length === 0"
    empty-description="暂无演示数据"
    :columns="appliedColumns"
    :data="pagedRows"
    :pagination="pagination"
    :row-key="rowKey"
    :table-props="tableProps"
  >
    <template #toolbar-left>
      <SearchBar>
        <NInput
          v-model:value="keyword"
          clearable
          placeholder="搜索 code / 名称 / 接口"
          style="width: 260px"
        />
        <NSelect
          v-model:value="ownerValue"
          :options="ownerOptions"
          style="width: 160px"
        />
        <NSelect
          v-model:value="statusValue"
          :options="statusOptions"
          style="width: 160px"
        />
        <NSelect
          v-model:value="sortValue"
          :options="sortOptions"
          style="width: 200px"
        />
        <NSelect
          v-model:value="deleteConfirmMode"
          :options="deleteConfirmModeOptions"
          style="width: 220px"
        />
        <NButton type="primary" @click="page = 1">查询</NButton>
        <NButton quaternary @click="resetFilters">重置</NButton>
      </SearchBar>
    </template>
    <template #toolbar-right>
      <NSpace>
        <NButton secondary @click="showEmpty = !showEmpty">
          {{ showEmpty ? '关闭空态' : '开启空态' }}
        </NButton>
        <NButton
          secondary
          :type="errorText ? 'warning' : 'default'"
          @click="errorText = errorText ? '' : '模拟接口错误：演示用途'"
        >
          {{ errorText ? '关闭错态' : '开启错态' }}
        </NButton>
        <NButton :disabled="checkedRowKeys.length === 0" @click="batchToggle">
          批量启停
        </NButton>
        <NPopconfirm
          :disabled="
            checkedRowKeys.length === 0 || deleteConfirmMode !== 'popover'
          "
          @positive-click="confirmBatchDelete"
        >
          <template #trigger>
            <NButton
              type="error"
              ghost
              :disabled="checkedRowKeys.length === 0"
              @click="
                deleteConfirmMode === 'dialog'
                  ? confirmBatchDelete()
                  : undefined
              "
            >
              批量删除
            </NButton>
          </template>
          确认删除选中项？
        </NPopconfirm>
        <NButton type="primary" @click="exportCurrentCsv">导出当前筛选</NButton>
        <TableColumnManager
          :items="columnManagerItems"
          :storage-key="COLUMN_PREFS_KEY"
          button-text="列管理"
          @change="onColumnManagerChange"
        />
      </NSpace>
    </template>
  </DataTablePage>
</template>
