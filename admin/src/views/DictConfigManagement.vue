<script setup lang="ts">
import { ref } from 'vue';
import { NButton, NCard, NDataTable, NInput, NSpace, NText } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import {
  getDictItemsByCodeMethod,
  getSystemConfigByKeyMethod,
  type DictItem,
  type SystemConfig,
} from '../api/modules/dict-config';

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
    errorText.value = error instanceof Error ? error.message : '加载失败';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <NSpace vertical :size="16">
    <NCard title="字典与配置（只读）" :bordered="false">
      <NSpace>
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
      </NSpace>
      <NText v-if="errorText" type="error">{{ errorText }}</NText>
    </NCard>

    <NCard title="字典项" :bordered="false">
      <NDataTable :columns="columns" :data="dictItems" :loading="loading" />
    </NCard>

    <NCard title="系统配置" :bordered="false">
      <pre v-if="configData">{{ configData }}</pre>
      <NText v-else depth="3">暂无数据，点击查询加载。</NText>
    </NCard>
  </NSpace>
</template>
