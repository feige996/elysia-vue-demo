<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { NButton, NCard, NTag, NText, type DataTableColumns } from 'naive-ui';
import {
  getCacheOverviewMethod,
  type CacheOverview,
} from '../api/modules/monitor';
import DataTablePage from '../components/crud/DataTablePage.vue';
import { getMappedErrorMessage } from '../api/error-map';

const loading = ref(false);
const errorText = ref('');
const cacheData = ref<CacheOverview | null>(null);

const namespaceRows = computed(() => cacheData.value?.namespaceStats ?? []);
const keyPreview = computed(() =>
  (cacheData.value?.sampledKeys ?? []).slice(0, 30),
);

const columns: DataTableColumns<{ namespace: string; count: number }> = [
  { title: '命名空间', key: 'namespace' },
  {
    title: '样本数量',
    key: 'count',
    width: 120,
    render: (row) => row.count,
  },
];

const loadOverview = async () => {
  loading.value = true;
  errorText.value = '';
  try {
    const response = await getCacheOverviewMethod();
    cacheData.value = response.data;
  } catch (error) {
    errorText.value = getMappedErrorMessage(error, '加载缓存总览失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  void loadOverview();
});
</script>

<template>
  <DataTablePage
    title="缓存监控"
    :loading="loading"
    :error-text="errorText"
    :empty="namespaceRows.length === 0"
    empty-description="暂无缓存统计数据"
    :columns="columns"
    :data="namespaceRows"
    :table-props="{ striped: true, maxHeight: 420 }"
  >
    <template #toolbar-left>
      <NText depth="3" v-if="cacheData">
        Redis:
        <NTag :type="cacheData.enabled ? 'success' : 'warning'" size="small">
          {{ cacheData.enabled ? '已启用' : '未启用' }}
        </NTag>
        状态 {{ cacheData.status }}，总 key {{ cacheData.totalKeys }}，采样
        {{ cacheData.sampledCount }}
      </NText>
    </template>
    <template #toolbar-right>
      <NButton type="primary" :loading="loading" @click="loadOverview">
        刷新
      </NButton>
    </template>
    <template #footer>
      <NCard title="缓存键采样预览（前 30）" :bordered="false">
        <NText v-if="keyPreview.length === 0" depth="3">暂无采样 key</NText>
        <div v-else class="key-preview">
          <NTag v-for="item in keyPreview" :key="item" size="small" type="info">
            {{ item }}
          </NTag>
        </div>
      </NCard>
    </template>
  </DataTablePage>
</template>

<style scoped>
.key-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
