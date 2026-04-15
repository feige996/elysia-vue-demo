<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import { NButton, NTag, NText, type DataTableColumns } from 'naive-ui';
import {
  getOnlineSessionsMethod,
  type OnlineSessionItem,
} from '../api/modules/monitor';
import DataTablePage from '../components/crud/DataTablePage.vue';
import { getMappedErrorMessage } from '../api/error-map';

const loading = ref(false);
const errorText = ref('');
const rows = ref<OnlineSessionItem[]>([]);

const columns: DataTableColumns<OnlineSessionItem> = [
  { title: '账号', key: 'account', width: 130 },
  { title: '角色', key: 'role', width: 110 },
  {
    title: '用户 ID',
    key: 'userId',
    width: 90,
    render: (row) => row.userId ?? '-',
  },
  { title: 'IP', key: 'ip', width: 140 },
  {
    title: '请求次数',
    key: 'requestCount',
    width: 100,
    render: (row) =>
      h(NTag, { type: 'info', size: 'small' }, () => row.requestCount),
  },
  { title: '首次活跃', key: 'firstSeenAt', width: 180 },
  { title: '最近活跃', key: 'lastSeenAt', width: 180 },
  {
    title: 'User-Agent',
    key: 'userAgent',
    ellipsis: {
      tooltip: true,
    },
  },
];

const summaryText = computed(() => `当前在线会话：${rows.value.length}`);

const loadSessions = async () => {
  loading.value = true;
  errorText.value = '';
  try {
    const response = await getOnlineSessionsMethod();
    rows.value = response.data.list;
  } catch (error) {
    errorText.value = getMappedErrorMessage(error, '加载在线用户失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  void loadSessions();
});
</script>

<template>
  <DataTablePage
    title="在线用户"
    :loading="loading"
    :error-text="errorText"
    :empty="rows.length === 0"
    empty-description="暂无在线用户会话"
    :columns="columns"
    :data="rows"
    :table-props="{ striped: true, maxHeight: 560 }"
  >
    <template #toolbar-left>
      <NText depth="3">{{ summaryText }}</NText>
    </template>
    <template #toolbar-right>
      <NButton type="primary" :loading="loading" @click="loadSessions">
        刷新
      </NButton>
    </template>
  </DataTablePage>
</template>
