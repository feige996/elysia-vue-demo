<script setup lang="ts">
import { h, onMounted, ref } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NSpace,
  NTag,
  NText,
  type DataTableColumns,
} from 'naive-ui';
import { getRolesMethod, type RoleRow } from '../api/modules/role';

const loading = ref(false);
const errorText = ref('');
const roles = ref<RoleRow[]>([]);

const columns: DataTableColumns<RoleRow> = [
  { title: 'ID', key: 'id', width: 72 },
  { title: '编码', key: 'code', width: 140 },
  { title: '名称', key: 'name' },
  { title: '说明', key: 'description' },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) =>
      h(
        NTag,
        { type: row.status === 1 ? 'success' : 'default', size: 'small' },
        { default: () => (row.status === 1 ? '启用' : '禁用') },
      ),
  },
];

const loadRoles = async () => {
  errorText.value = '';
  loading.value = true;
  try {
    const response = await getRolesMethod();
    roles.value = response.data;
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '加载失败';
    roles.value = [];
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  void loadRoles();
});
</script>

<template>
  <NCard title="角色管理" :bordered="false">
    <NSpace vertical :size="12">
      <NSpace>
        <NButton type="primary" :loading="loading" @click="loadRoles"
          >刷新</NButton
        >
      </NSpace>
      <NText v-if="errorText" type="error">{{ errorText }}</NText>
      <NEmpty
        v-if="!loading && !errorText && roles.length === 0"
        description="暂无角色数据"
      />
      <NDataTable
        v-else
        :columns="columns"
        :data="roles"
        :loading="loading"
        :pagination="false"
      />
    </NSpace>
  </NCard>
</template>
