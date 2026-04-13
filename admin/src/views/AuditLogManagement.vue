<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { NButton, NCard, NDataTable, NInput, NSpace, NSwitch, NText } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { getAuditLogsMethod, type AuditLogItem } from '../api/modules/audit-log';

const moduleKeyword = ref('');
const successOnly = ref(false);
const loading = ref(false);
const errorText = ref('');
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const rows = ref<AuditLogItem[]>([]);

const columns: DataTableColumns<AuditLogItem> = [
  { title: '时间', key: 'createdAt', width: 180 },
  { title: '模块', key: 'module', width: 120 },
  { title: '方法', key: 'requestMethod', width: 90 },
  { title: '路径', key: 'requestPath' },
  { title: '状态码', key: 'responseCode', width: 90 },
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
  try {
    const response = await getAuditLogsMethod({
      page: page.value,
      pageSize: pageSize.value,
      module: moduleKeyword.value || undefined,
      success: successOnly.value ? 1 : undefined,
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
          style="width: 220px"
        />
        <NSpace align="center">
          <NText>仅成功</NText>
          <NSwitch v-model:value="successOnly" />
        </NSpace>
        <NButton type="primary" :loading="loading" @click="loadLogs">查询</NButton>
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
