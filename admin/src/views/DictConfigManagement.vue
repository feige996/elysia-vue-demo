<script setup lang="ts">
import { ref } from 'vue';
import { NButton, NCard, NInput, NSpace, NText } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import {
  getDictItemsByCodeMethod,
  getSystemConfigByKeyMethod,
  type DictItem,
  type SystemConfig,
} from '../api/modules/dict-config';
import { getMappedErrorMessage } from '../api/error-map';
import SearchBar from '../components/crud/SearchBar.vue';
import DataTablePage from '../components/crud/DataTablePage.vue';

const dictCode = ref('sys_common_status');
const configKey = ref('system.theme.defaultMode');
const dictItems = ref<DictItem[]>([]);
const configData = ref<SystemConfig | null>(null);
const loading = ref(false);
const errorText = ref('');

const columns: DataTableColumns<DictItem> = [
  { title: '标签', key: 'label' },
  { title: '值', key: 'value' },
  { title: '排序', key: 'sort', width: 90 },
  { title: '默认', key: 'isDefault', width: 90 },
];

const loadData = async () => {
  errorText.value = '';
  loading.value = true;
  try {
    const [dictRes, configRes] = await Promise.all([
      getDictItemsByCodeMethod(dictCode.value),
      getSystemConfigByKeyMethod(configKey.value),
    ]);
    dictItems.value = dictRes.data;
    configData.value = configRes.data;
  } catch (error) {
    errorText.value = getMappedErrorMessage(error, '加载失败');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <NSpace vertical :size="12">
    <DataTablePage
      title="字典项"
      :loading="loading"
      :error-text="errorText"
      :empty="dictItems.length === 0"
      empty-description="暂无字典项数据"
      :columns="columns"
      :data="dictItems"
      :pagination="false"
    >
      <template #toolbar-left>
        <SearchBar>
          <NInput
            v-model:value="dictCode"
            placeholder="字典编码"
            style="width: 220px"
          />
          <NInput
            v-model:value="configKey"
            placeholder="配置键"
            style="width: 260px"
          />
          <NButton type="primary" :loading="loading" @click="loadData"
            >查询</NButton
          >
        </SearchBar>
      </template>
    </DataTablePage>
    <NCard title="系统配置" :bordered="false">
      <pre v-if="configData">{{ configData }}</pre>
      <NText v-else depth="3">暂无数据，点击查询加载。</NText>
    </NCard>
  </NSpace>
</template>
