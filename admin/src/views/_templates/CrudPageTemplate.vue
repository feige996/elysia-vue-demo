<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import { NButton, NForm, NFormItem, NInput, NSpace } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import DataTablePage from '../../components/crud/DataTablePage.vue';
import FormDrawer from '../../components/crud/FormDrawer.vue';
import SearchBar from '../../components/crud/SearchBar.vue';
import { useListQuery } from '../../composables/useListQuery';

type DemoRow = {
  id: number;
  name: string;
  code: string;
  status: 0 | 1;
};

const drawerVisible = ref(false);
const saving = ref(false);
const form = ref({
  id: 0,
  name: '',
  code: '',
});

const rows = ref<DemoRow[]>([]);
const total = ref(0);

const {
  query,
  loading,
  errorText,
  run: fetchList,
  reset: resetQuery,
} = useListQuery({
  createInitialQuery: () => ({
    keyword: '',
    page: 1,
    pageSize: 20,
  }),
  request: async () => {
    // TODO: 替换为真实 API 调用
    return {
      data: {
        list: [] as DemoRow[],
        total: 0,
      },
    };
  },
  onSuccess: (response) => {
    rows.value = response.data.list;
    total.value = response.data.total;
  },
  onError: () => {
    errorText.value = '加载失败';
    rows.value = [];
    total.value = 0;
  },
});

const pagination = computed(() => ({
  page: query.page,
  pageSize: query.pageSize,
  itemCount: total.value,
  showSizePicker: true,
  pageSizes: [20, 50, 100],
  onUpdatePage: (nextPage: number) => {
    query.page = nextPage;
    void fetchList();
  },
  onUpdatePageSize: (nextPageSize: number) => {
    query.pageSize = nextPageSize;
    query.page = 1;
    void fetchList();
  },
}));

const columns: DataTableColumns<DemoRow> = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '名称', key: 'name' },
  { title: '编码', key: 'code' },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => (row.status === 1 ? '启用' : '禁用'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    render: (row) =>
      h(
        NSpace,
        { size: 8 },
        {
          default: () => [
            h(
              NButton,
              {
                size: 'small',
                onClick: () => openEditDrawer(row),
              },
              { default: () => '编辑' },
            ),
          ],
        },
      ),
  },
];

const openCreateDrawer = () => {
  form.value = { id: 0, name: '', code: '' };
  drawerVisible.value = true;
};

const openEditDrawer = (row: DemoRow) => {
  form.value = { id: row.id, name: row.name, code: row.code };
  drawerVisible.value = true;
};

const submitForm = async () => {
  saving.value = true;
  try {
    // TODO: 替换为 create/update API 调用
    drawerVisible.value = false;
    await fetchList();
  } finally {
    saving.value = false;
  }
};

const resetFilters = () => {
  resetQuery();
  void fetchList();
};

onMounted(() => {
  void fetchList();
});
</script>

<template>
  <DataTablePage
    title="示例 CRUD 页面"
    :loading="loading"
    :error-text="errorText"
    :empty="rows.length === 0"
    empty-description="暂无数据"
    :columns="columns"
    :data="rows"
    :pagination="pagination"
  >
    <template #toolbar-left>
      <SearchBar>
        <NInput
          v-model:value="query.keyword"
          clearable
          placeholder="按名称/编码搜索"
          style="width: 260px"
        />
        <NButton type="primary" :loading="loading" @click="fetchList"
          >查询</NButton
        >
        <NButton quaternary :loading="loading" @click="resetFilters"
          >重置</NButton
        >
      </SearchBar>
    </template>

    <template #toolbar-right>
      <NButton
        v-permission="'demo:create'"
        type="primary"
        @click="openCreateDrawer"
      >
        新增
      </NButton>
    </template>
  </DataTablePage>

  <FormDrawer
    v-model:show="drawerVisible"
    title="新增/编辑"
    :loading="saving"
    @save="submitForm"
  >
    <NForm label-placement="left" label-width="90">
      <NFormItem label="名称" required>
        <NInput v-model:value="form.name" placeholder="请输入名称" />
      </NFormItem>
      <NFormItem label="编码" required>
        <NInput v-model:value="form.code" placeholder="请输入编码" />
      </NFormItem>
    </NForm>
  </FormDrawer>
</template>
