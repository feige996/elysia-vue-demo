<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { NButton, NInput, NSelect } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import DataTablePage from '../components/crud/DataTablePage.vue';
import SearchBar from '../components/crud/SearchBar.vue';
import { getMappedErrorMessage } from '../api/error-map';
import { useListQuery } from '../composables/useListQuery';
import {
  getApiCatalogMethod,
  type ApiCatalogItem,
} from '../api/modules/system-ops';

const rows = ref<ApiCatalogItem[]>([]);
const total = ref(0);

const columns: DataTableColumns<ApiCatalogItem> = [
  { title: 'ID', key: 'id', width: 70 },
  { title: '权限码', key: 'code', width: 240 },
  { title: '名称', key: 'name', width: 180 },
  { title: '模块', key: 'module', width: 140 },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) => (row.status === 1 ? '启用' : '禁用'),
  },
  { title: '描述', key: 'description' },
];

const {
  query,
  loading,
  errorText,
  run: loadList,
  reset: resetQuery,
} = useListQuery({
  createInitialQuery: () => ({
    keyword: '',
    moduleKeyword: '',
    statusValue: 'all' as 'all' | 'enabled' | 'disabled',
    page: 1,
    pageSize: 20,
  }),
  request: (currentQuery) =>
    getApiCatalogMethod({
      page: currentQuery.page,
      pageSize: currentQuery.pageSize,
      keyword: currentQuery.keyword || undefined,
      module: currentQuery.moduleKeyword || undefined,
      status:
        currentQuery.statusValue === 'all'
          ? undefined
          : currentQuery.statusValue === 'enabled'
            ? 1
            : 0,
    }),
  onSuccess: (response) => {
    rows.value = response.data.list;
    total.value = response.data.total;
  },
  onError: (error) => {
    errorText.value = getMappedErrorMessage(error, '加载 API 目录失败');
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
    void loadList();
  },
  onUpdatePageSize: (nextSize: number) => {
    query.pageSize = nextSize;
    query.page = 1;
    void loadList();
  },
}));

const resetFilter = () => {
  resetQuery();
  void loadList();
};

onMounted(() => {
  void loadList();
});
</script>

<template>
  <DataTablePage
    title="API 目录"
    :loading="loading"
    :error-text="errorText"
    :empty="rows.length === 0"
    empty-description="暂无 API 目录数据"
    :columns="columns"
    :data="rows"
    :pagination="pagination"
  >
    <template #toolbar-left>
      <SearchBar>
        <NInput
          v-model:value="query.keyword"
          clearable
          placeholder="按权限码/名称筛选"
          style="width: 220px"
        />
        <NInput
          v-model:value="query.moduleKeyword"
          clearable
          placeholder="按模块筛选"
          style="width: 180px"
        />
        <NSelect
          v-model:value="query.statusValue"
          style="width: 160px"
          :options="[
            { label: '全部状态', value: 'all' },
            { label: '仅启用', value: 'enabled' },
            { label: '仅禁用', value: 'disabled' },
          ]"
        />
        <NButton type="primary" :loading="loading" @click="loadList"
          >查询</NButton
        >
        <NButton quaternary :loading="loading" @click="resetFilter"
          >重置</NButton
        >
      </SearchBar>
    </template>
  </DataTablePage>
</template>
