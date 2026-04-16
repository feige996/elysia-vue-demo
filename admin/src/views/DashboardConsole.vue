<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { NButton, NCard, NGrid, NGridItem, NStatistic, NTag } from 'naive-ui';
import {
  getDashboardSummaryMethod,
  getOperationTrendMethod,
  type DashboardSummary,
  type OperationTrendItem,
} from '../api/modules/monitor';
import DataTablePage from '../components/crud/DataTablePage.vue';
import { getMappedErrorMessage } from '../api/error-map';

const loading = ref(false);
const errorText = ref('');
const summary = ref<DashboardSummary>({
  todayLoginCount: 0,
  totalLoginCount: 0,
  onlineUserCount: 0,
  totalJobCount: 0,
  cacheKeyCount: 0,
  cacheEnabled: false,
});
const trends = ref<OperationTrendItem[]>([]);

const columns = [
  { title: '日期', key: 'date' },
  { title: '成功数', key: 'success' },
  { title: '失败数', key: 'failed' },
];

const loadData = async () => {
  loading.value = true;
  errorText.value = '';
  try {
    const [summaryResponse, trendResponse] = await Promise.all([
      getDashboardSummaryMethod(),
      getOperationTrendMethod(7),
    ]);
    summary.value = summaryResponse.data;
    trends.value = trendResponse.data;
  } catch (error) {
    errorText.value = getMappedErrorMessage(error, '加载控制台数据失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  void loadData();
});
</script>

<template>
  <DataTablePage
    title="控制台首页"
    table-layout="compact"
    :loading="loading"
    :error-text="errorText"
    :empty="trends.length === 0"
    empty-description="暂无趋势数据"
    :columns="columns"
    :data="trends"
  >
    <template #toolbar-right>
      <NButton type="primary" :loading="loading" @click="loadData"
        >刷新</NButton
      >
    </template>
    <NGrid :cols="4" :x-gap="12" :y-gap="12">
      <NGridItem>
        <NCard>
          <NStatistic label="今日登录" :value="summary.todayLoginCount" />
        </NCard>
      </NGridItem>
      <NGridItem>
        <NCard>
          <NStatistic label="在线用户" :value="summary.onlineUserCount" />
        </NCard>
      </NGridItem>
      <NGridItem>
        <NCard>
          <NStatistic label="任务总数" :value="summary.totalJobCount" />
        </NCard>
      </NGridItem>
      <NGridItem>
        <NCard>
          <NStatistic label="缓存 Key" :value="summary.cacheKeyCount" />
          <NTag
            style="margin-top: 8px"
            :type="summary.cacheEnabled ? 'success' : 'warning'"
            size="small"
          >
            {{ summary.cacheEnabled ? '缓存已启用' : '缓存未启用' }}
          </NTag>
        </NCard>
      </NGridItem>
    </NGrid>
  </DataTablePage>
</template>
