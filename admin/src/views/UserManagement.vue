<script setup lang="ts">
import { computed, h, ref } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NInput,
  NSpace,
  NTag,
  NText,
  type DataTableColumns,
} from 'naive-ui';
import { requestState } from '../api/request';
import { getUsersPageMethod, type User } from '../api/modules/user';

type UserRow = User;

const keyword = ref('');
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const users = ref<UserRow[]>([]);
const errorText = ref('');

const { loading, send } = requestState.useRequest(
  () =>
    getUsersPageMethod({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
    }),
  {
    immediate: false,
  },
);

const columns: DataTableColumns<UserRow> = [
  {
    title: 'ID',
    key: 'id',
    width: 80,
  },
  {
    title: '账号',
    key: 'account',
  },
  {
    title: '姓名',
    key: 'name',
  },
  {
    title: '角色',
    key: 'role',
    render: (row) =>
      h(
        NTag,
        { type: row.role === 'admin' ? 'error' : 'info' },
        { default: () => row.role },
      ),
  },
];

const pagination = computed(() => ({
  page: page.value,
  pageSize: pageSize.value,
  itemCount: total.value,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  onUpdatePage: (nextPage: number) => {
    page.value = nextPage;
    void fetchUsers();
  },
  onUpdatePageSize: (nextPageSize: number) => {
    pageSize.value = nextPageSize;
    page.value = 1;
    void fetchUsers();
  },
}));

const fetchUsers = async () => {
  errorText.value = '';
  try {
    const response = await send();
    users.value = response.data.list;
    total.value = response.data.total;
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '加载失败';
  }
};
</script>

<template>
  <NCard title="用户管理" :bordered="false">
    <NSpace vertical :size="12">
      <NSpace>
        <NInput
          v-model:value="keyword"
          clearable
          placeholder="按账号或姓名搜索"
          style="width: 280px"
        />
        <NButton type="primary" :loading="loading" @click="fetchUsers"
          >查询</NButton
        >
      </NSpace>
      <NText v-if="errorText" type="error">{{ errorText }}</NText>
      <NDataTable
        :columns="columns"
        :data="users"
        :loading="loading"
        :pagination="pagination"
      />
    </NSpace>
  </NCard>
</template>
