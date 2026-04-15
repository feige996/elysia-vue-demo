<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import {
  NButton,
  NInput,
  NInputNumber,
  NPopconfirm,
  NTag,
  NText,
  type DataTableColumns,
} from 'naive-ui';
import {
  createIpBlacklistMethod,
  deleteIpBlacklistMethod,
  getIpBlacklistMethod,
  type IpBlacklistItem,
} from '../api/modules/monitor';
import DataTablePage from '../components/crud/DataTablePage.vue';
import SearchBar from '../components/crud/SearchBar.vue';
import { getMappedErrorMessage } from '../api/error-map';

const loading = ref(false);
const errorText = ref('');
const list = ref<IpBlacklistItem[]>([]);
const enabled = ref(false);
const ipInput = ref('');
const reasonInput = ref('');
const expiresInMinutesInput = ref<number | null>(60);

const columns: DataTableColumns<IpBlacklistItem> = [
  { title: 'IP', key: 'ip', width: 180 },
  {
    title: '来源',
    key: 'source',
    width: 90,
    render: (row) => (row.source === 'auto' ? '自动' : '手工'),
  },
  { title: '原因', key: 'reason', minWidth: 200 },
  { title: '命中次数', key: 'hitCount', width: 100 },
  {
    title: '最近命中',
    key: 'lastHitAt',
    width: 180,
    render: (row) => row.lastHitAt ?? '-',
  },
  { title: '创建时间', key: 'createdAt', width: 180 },
  {
    title: '过期时间',
    key: 'expiresAt',
    width: 180,
    render: (row) => row.expiresAt ?? '不过期',
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row) =>
      h(
        NPopconfirm,
        {
          onPositiveClick: async () => {
            await deleteRule(row.ip);
          },
        },
        {
          trigger: () =>
            h(
              NButton,
              { type: 'error', size: 'small', ghost: true },
              { default: () => '删除' },
            ),
          default: () => `确认删除 ${row.ip} ?`,
        },
      ),
  },
];

const summary = computed(() => `规则数：${list.value.length}`);

const loadList = async () => {
  loading.value = true;
  errorText.value = '';
  try {
    const response = await getIpBlacklistMethod();
    enabled.value = response.data.enabled;
    list.value = response.data.list;
  } catch (error) {
    errorText.value = getMappedErrorMessage(error, '加载 IP 黑名单失败');
  } finally {
    loading.value = false;
  }
};

const addRule = async () => {
  const ip = ipInput.value.trim();
  if (!ip) {
    errorText.value = '请填写 IP';
    return;
  }
  loading.value = true;
  errorText.value = '';
  try {
    await createIpBlacklistMethod({
      ip,
      reason: reasonInput.value.trim() || undefined,
      expiresInMinutes: expiresInMinutesInput.value ?? undefined,
    });
    ipInput.value = '';
    reasonInput.value = '';
    await loadList();
  } catch (error) {
    errorText.value = getMappedErrorMessage(error, '新增 IP 黑名单失败');
  } finally {
    loading.value = false;
  }
};

const deleteRule = async (ip: string) => {
  loading.value = true;
  errorText.value = '';
  try {
    await deleteIpBlacklistMethod(ip);
    await loadList();
  } catch (error) {
    errorText.value = getMappedErrorMessage(error, '删除 IP 黑名单失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  void loadList();
});
</script>

<template>
  <DataTablePage
    title="IP 黑名单"
    :loading="loading"
    :error-text="errorText"
    :empty="list.length === 0"
    empty-description="暂无黑名单规则"
    :columns="columns"
    :data="list"
    :table-props="{ striped: true, maxHeight: 560 }"
  >
    <template #toolbar-left>
      <div>
        <NText depth="3">
          开关状态：
          <NTag :type="enabled ? 'success' : 'warning'" size="small">
            {{ enabled ? '已启用' : '未启用' }}
          </NTag>
          {{ summary }}
        </NText>
        <NText type="warning">
          第三个字段的数字表示过期分钟，表示自动解封时间，留空表示不过期（默认
          60 分钟）。
        </NText>
      </div>
    </template>
    <template #toolbar-right>
      <SearchBar>
        <NInput
          v-model:value="ipInput"
          clearable
          placeholder="IP（如 127.0.0.1）"
          style="width: 200px"
        />
        <NInput
          v-model:value="reasonInput"
          clearable
          placeholder="封禁原因"
          style="width: 200px"
        />
        <NInputNumber
          v-model:value="expiresInMinutesInput"
          clearable
          :min="1"
          :max="10080"
          placeholder="过期分钟（自动解封）"
          style="width: 180px"
        />
        <NButton type="primary" :loading="loading" @click="addRule">
          新增
        </NButton>
        <NButton :loading="loading" @click="loadList">刷新</NButton>
      </SearchBar>
    </template>
  </DataTablePage>
</template>
