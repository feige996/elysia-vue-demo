<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { NButton, NInput, NSelect } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import DataTablePage from '../components/crud/DataTablePage.vue';
import SearchBar from '../components/crud/SearchBar.vue';
import { getMappedErrorMessage } from '../api/error-map';
import {
  getApiCatalogMethod,
  type ApiCatalogItem,
} from '../api/modules/system-ops';

const keyword = ref('');
const moduleKeyword = ref('');
const statusValue = ref<'all' | 'enabled' | 'disabled'>('all');
const loading = ref(false);
const errorText = ref('');
const rows = ref<ApiCatalogItem[]>([]);
const page = ref(1);
const pageSize = ref(20);
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

const pagination = computed(() => ({
  page: page.value,
  pageSize: pageSize.value,
  itemCount: total.value,
  showSizePicker: true,
  pageSizes: [20, 50, 100],
  onUpdatePage: (nextPage: number) => {
    page.value = nextPage;
    void loadList();
  },
  onUpdatePageSize: (nextSize: number) => {
    pageSize.value = nextSize;
    page.value = 1;
    void loadList();
  },
}));

const loadList = async () => {
  loading.value = true;
  errorText.value = '';
  try {
    const response = await getApiCatalogMethod({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      module: moduleKeyword.value || undefined,
      status:
        statusValue.value === 'all'
          ? undefined
          : statusValue.value === 'enabled'
            ? 1
            : 0,
    });
    rows.value = response.data.list;
    total.value = response.data.total;
  } catch (error) {
    errorText.value = getMappedErrorMessage(error, '加载 API 目录失败');
  } finally {
    loading.value = false;
  }
};

const resetFilter = () => {
  keyword.value = '';
  moduleKeyword.value = '';
  statusValue.value = 'all';
  page.value = 1;
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
          v-model:value="keyword"
          clearable
          placeholder="按权限码/名称筛选"
          style="width: 220px"
        />
        <NInput
          v-model:value="moduleKeyword"
          clearable
          placeholder="按模块筛选"
          style="width: 180px"
        />
        <NSelect
          v-model:value="statusValue"
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
