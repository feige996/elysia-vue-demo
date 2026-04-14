<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NInput,
  NSelect,
  NSpace,
  NText,
} from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import {
  getAuditLogsMethod,
  type AuditLogItem,
} from '../api/modules/audit-log';

const moduleKeyword = ref('');
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

const loadLogs = async () => {
  errorText.value = '';
  loading.value = true;
  const operatorUserId = Number(operatorUserIdText.value);
  const [dateFromMs, dateToMs] = dateRange.value ?? [];
  try {
    const response = await getAuditLogsMethod({
      page: page.value,
      pageSize: pageSize.value,
      module: moduleKeyword.value || undefined,
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
    errorText.value = error instanceof Error ? error.message : '加载日志失败';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  void loadLogs();
});
</script>

<template>
  <NCard title="操作日志" :bordered="false">
    <NSpace vertical :size="12">
      <NSpace align="center">
        <NInput
          v-model:value="moduleKeyword"
          clearable
          placeholder="按模块筛选"
          style="width: 180px"
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
      </NSpace>
      <NText v-if="errorText" type="error">{{ errorText }}</NText>
      <NDataTable
        :columns="columns"
        :data="rows"
        :loading="loading"
        :pagination="pagination"
      />
    </NSpace>
  </NCard>
</template>
