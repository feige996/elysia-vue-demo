<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { NButton, NDatePicker, NInput, NSelect } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { useRoute, useRouter } from 'vue-router';
import {
  getAuditLogsMethod,
  type AuditLogItem,
} from '../api/modules/audit-log';
import SearchBar from '../components/crud/SearchBar.vue';
import DataTablePage from '../components/crud/DataTablePage.vue';
import { getMappedErrorMessage } from '../api/error-map';

const moduleKeyword = ref('');
const actionKeyword = ref('');
const operatorAccountKeyword = ref('');
const operatorUserIdText = ref('');
const successValue = ref<'all' | 'success' | 'failed'>('all');
const dateRange = ref<[number, number] | null>(null);
const loading = ref(false);
const errorText = ref('');
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const rows = ref<AuditLogItem[]>([]);
const route = useRoute();
const router = useRouter();

const columns: DataTableColumns<AuditLogItem> = [
  { title: '时间', key: 'createdAt', width: 180 },
  { title: '模块', key: 'module', width: 120 },
  { title: '操作者ID', key: 'operatorUserId', width: 100 },
  { title: '操作者账号', key: 'operatorAccount', width: 120 },
  { title: '方法', key: 'requestMethod', width: 90 },
  { title: '路径', key: 'requestPath' },
  { title: '状态码', key: 'responseCode', width: 90 },
  { title: '结果', key: 'success', width: 80 },
  { title: '耗时(ms)', key: 'durationMs', width: 100 },
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

const tableProps = {
  striped: true,
  maxHeight: 560,
};

const readQueryString = (value: unknown) => {
  if (Array.isArray(value)) return value[0] ?? '';
  return typeof value === 'string' ? value : '';
};

const readPositiveIntQuery = (value: unknown, fallback: number) => {
  const text = readQueryString(value);
  const parsed = Number.parseInt(text, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const readDateMsQuery = (value: unknown) => {
  const text = readQueryString(value);
  if (!text) return null;
  const ms = Date.parse(text);
  return Number.isNaN(ms) ? null : ms;
};

const syncQueryToUrl = async () => {
  const [dateFromMs, dateToMs] = dateRange.value ?? [];
  const nextQuery = {
    ...route.query,
    module: moduleKeyword.value || undefined,
    action: actionKeyword.value || undefined,
    operatorAccount: operatorAccountKeyword.value || undefined,
    success: successValue.value === 'all' ? undefined : successValue.value,
    dateFrom:
      typeof dateFromMs === 'number'
        ? new Date(dateFromMs).toISOString()
        : undefined,
    dateTo:
      typeof dateToMs === 'number'
        ? new Date(dateToMs).toISOString()
        : undefined,
    page: String(page.value),
    pageSize: String(pageSize.value),
  };

  await router.replace({ query: nextQuery });
};

const hydrateFromUrlQuery = () => {
  moduleKeyword.value = readQueryString(route.query.module);
  actionKeyword.value = readQueryString(route.query.action);
  operatorAccountKeyword.value = readQueryString(route.query.operatorAccount);
  successValue.value =
    route.query.success === 'success' || route.query.success === 'failed'
      ? route.query.success
      : 'all';

  const dateFromMs = readDateMsQuery(route.query.dateFrom);
  const dateToMs = readDateMsQuery(route.query.dateTo);
  dateRange.value =
    typeof dateFromMs === 'number' && typeof dateToMs === 'number'
      ? [dateFromMs, dateToMs]
      : null;

  page.value = readPositiveIntQuery(route.query.page, 1);
  pageSize.value = readPositiveIntQuery(route.query.pageSize, 20);
};

const loadLogs = async () => {
  errorText.value = '';
  loading.value = true;
  const operatorUserId = Number(operatorUserIdText.value);
  const [dateFromMs, dateToMs] = dateRange.value ?? [];
  try {
    await syncQueryToUrl();
    const response = await getAuditLogsMethod({
      page: page.value,
      pageSize: pageSize.value,
      module: moduleKeyword.value || undefined,
      action: actionKeyword.value || undefined,
      operatorAccount: operatorAccountKeyword.value || undefined,
      operatorUserId:
        Number.isInteger(operatorUserId) && operatorUserId > 0
          ? operatorUserId
          : undefined,
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
    errorText.value = getMappedErrorMessage(error, '加载日志失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  hydrateFromUrlQuery();
  void loadLogs();
});

const applyAutoBlockQuickFilter = () => {
  moduleKeyword.value = 'security-ip-blacklist';
  actionKeyword.value = 'AUTO_BLOCK';
  page.value = 1;
  void loadLogs();
};

const resetFilter = () => {
  moduleKeyword.value = '';
  actionKeyword.value = '';
  operatorAccountKeyword.value = '';
  operatorUserIdText.value = '';
  successValue.value = 'all';
  dateRange.value = null;
  page.value = 1;
  void loadLogs();
};
</script>

<template>
  <DataTablePage
    title="操作日志"
    :loading="loading"
    :error-text="errorText"
    :empty="rows.length === 0"
    empty-description="暂无日志数据"
    :columns="columns"
    :data="rows"
    :pagination="pagination"
    :table-props="tableProps"
  >
    <template #toolbar-left>
      <SearchBar>
        <NInput
          v-model:value="moduleKeyword"
          clearable
          placeholder="按模块筛选"
          style="width: 180px"
        />
        <NInput
          v-model:value="actionKeyword"
          clearable
          placeholder="按动作筛选"
          style="width: 160px"
        />
        <NInput
          v-model:value="operatorAccountKeyword"
          clearable
          placeholder="按操作者账号筛选"
          style="width: 180px"
        />
        <NInput
          v-model:value="operatorUserIdText"
          clearable
          placeholder="按操作者 ID 筛选"
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
        <NButton tertiary :loading="loading" @click="applyAutoBlockQuickFilter">
          自动封禁事件
        </NButton>
        <NButton quaternary :loading="loading" @click="resetFilter">
          重置
        </NButton>
      </SearchBar>
    </template>
  </DataTablePage>
</template>
