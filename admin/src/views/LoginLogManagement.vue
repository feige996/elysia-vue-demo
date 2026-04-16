<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { NButton, NDatePicker, NInput, NSelect } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import DataTablePage from '../components/crud/DataTablePage.vue';
import SearchBar from '../components/crud/SearchBar.vue';
import { getMappedErrorMessage } from '../api/error-map';
import {
  getLoginLogsMethod,
  type LoginLogItem,
} from '../api/modules/system-ops';

const accountKeyword = ref('');
const requestIpKeyword = ref('');
const successValue = ref<'all' | 'success' | 'failed'>('all');
const dateRange = ref<[number, number] | null>(null);

const loading = ref(false);
const errorText = ref('');
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const rows = ref<LoginLogItem[]>([]);

const columns: DataTableColumns<LoginLogItem> = [
  { title: '时间', key: 'createdAt', width: 180 },
  { title: '账号', key: 'account', width: 140 },
  { title: '用户ID', key: 'userId', width: 90 },
  {
    title: '结果',
    key: 'success',
    width: 90,
    render: (row) => (row.success === 1 ? '成功' : '失败'),
  },
  { title: '失败原因', key: 'reason', width: 180 },
  { title: 'IP', key: 'requestIp', width: 140 },
  {
    title: 'UA',
    key: 'userAgent',
    ellipsis: { tooltip: true },
  },
];

const pagination = computed(() => ({
  page: page.value,
  pageSize: pageSize.value,
  itemCount: total.value,
  showSizePicker: true,
  pageSizes: [20, 50, 100],
  onUpdatePage: (nextPage: number) => {
    page.value = nextPage;
    void loadLogs();
  },
  onUpdatePageSize: (nextSize: number) => {
    pageSize.value = nextSize;
    page.value = 1;
    void loadLogs();
  },
}));

const loadLogs = async () => {
  loading.value = true;
  errorText.value = '';
  const [dateFromMs, dateToMs] = dateRange.value ?? [];
  try {
    const response = await getLoginLogsMethod({
      page: page.value,
      pageSize: pageSize.value,
      account: accountKeyword.value || undefined,
      requestIp: requestIpKeyword.value || undefined,
      success:
        successValue.value === 'all'
          ? undefined
          : successValue.value === 'success'
            ? 1
            : 0,
      dateFrom:
        typeof dateFromMs === 'number'
          ? new Date(dateFromMs).toISOString()
          : undefined,
      dateTo:
        typeof dateToMs === 'number'
          ? new Date(dateToMs).toISOString()
          : undefined,
    });
    rows.value = response.data.list;
    total.value = response.data.total;
  } catch (error) {
    errorText.value = getMappedErrorMessage(error, '加载登录日志失败');
  } finally {
    loading.value = false;
  }
};

const resetFilter = () => {
  accountKeyword.value = '';
  requestIpKeyword.value = '';
  successValue.value = 'all';
  dateRange.value = null;
  page.value = 1;
  void loadLogs();
};

onMounted(() => {
  void loadLogs();
});
</script>

<template>
  <DataTablePage
    title="登录日志"
    :loading="loading"
    :error-text="errorText"
    :empty="rows.length === 0"
    empty-description="暂无登录日志"
    :columns="columns"
    :data="rows"
    :pagination="pagination"
    :table-props="{ striped: true, maxHeight: 560 }"
  >
    <template #toolbar-left>
      <SearchBar>
        <NInput
          v-model:value="accountKeyword"
          clearable
          placeholder="按账号筛选"
          style="width: 180px"
        />
        <NInput
          v-model:value="requestIpKeyword"
          clearable
          placeholder="按 IP 筛选"
          style="width: 180px"
        />
        <NSelect
          v-model:value="successValue"
          style="width: 160px"
          :options="[
            { label: '全部结果', value: 'all' },
            { label: '仅成功', value: 'success' },
            { label: '仅失败', value: 'failed' },
          ]"
        />
        <NDatePicker
          v-model:value="dateRange"
          type="datetimerange"
          clearable
          style="width: 320px"
        />
        <NButton type="primary" :loading="loading" @click="loadLogs"
          >查询</NButton
        >
        <NButton quaternary :loading="loading" @click="resetFilter"
          >重置</NButton
        >
      </SearchBar>
    </template>
  </DataTablePage>
</template>
