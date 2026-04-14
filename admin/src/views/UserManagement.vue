<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSpace,
  NSelect,
  NTag,
  NText,
  useDialog,
  useMessage,
  type DataTableRowKey,
  type DataTableColumns,
} from 'naive-ui';
import {
  batchDeleteUsersMethod,
  createUserMethod,
  deleteUserMethod,
  getUsersPageMethod,
  updateUserMethod,
  type User,
} from '../api/modules/user';
import { getMappedErrorMessage } from '../api/error-map';

type UserRow = User;

const keyword = ref('');
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const users = ref<UserRow[]>([]);
const loading = ref(false);
const saving = ref(false);
const errorText = ref('');
const checkedRowKeys = ref<DataTableRowKey[]>([]);

const dialog = useDialog();
const message = useMessage();

const userModalVisible = ref(false);
const userModalMode = ref<'create' | 'edit'>('create');
const userForm = ref({
  id: 0,
  account: '',
  name: '',
  role: 'editor' as User['role'],
});

const roleOptions = [
  { label: '管理员', value: 'admin' },
  { label: '编辑', value: 'editor' },
];

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
  {
    title: '操作',
    key: 'actions',
    width: 160,
    render: (row) =>
      h(
        NSpace,
        { size: 8 },
        {
          default: () => [
            h(
              NButton,
              { size: 'small', onClick: () => openEditUserModal(row) },
              { default: () => '编辑' },
            ),
            h(
              NButton,
              {
                size: 'small',
                type: 'error',
                ghost: true,
                onClick: () => deleteOneUser(row),
              },
              { default: () => '删除' },
            ),
          ],
        },
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
  loading.value = true;
  try {
    const response = await getUsersPageMethod({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
    });
    users.value = response.data.list;
    total.value = response.data.total;
  } catch (error) {
    errorText.value = getMappedErrorMessage(error, '加载失败');
    users.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

const openCreateUserModal = () => {
  userModalMode.value = 'create';
  userForm.value = {
    id: 0,
    account: '',
    name: '',
    role: 'editor',
  };
  userModalVisible.value = true;
};

const openEditUserModal = (row: UserRow) => {
  userModalMode.value = 'edit';
  userForm.value = {
    id: row.id,
    account: row.account,
    name: row.name,
    role: row.role,
  };
  userModalVisible.value = true;
};

const submitUserForm = async () => {
  const account = userForm.value.account.trim();
  const name = userForm.value.name.trim();
  if (!account || !name) {
    message.error('请填写账号与姓名');
    return;
  }
  saving.value = true;
  try {
    if (userModalMode.value === 'create') {
      await createUserMethod({
        account,
        name,
        role: userForm.value.role,
      });
      message.success('用户创建成功');
    } else {
      await updateUserMethod(userForm.value.id, {
        account,
        name,
        role: userForm.value.role,
      });
      message.success('用户更新成功');
    }
    userModalVisible.value = false;
    await fetchUsers();
  } catch (error) {
    message.error(getMappedErrorMessage(error, '保存失败'));
  } finally {
    saving.value = false;
  }
};

const deleteOneUser = (row: UserRow) => {
  dialog.warning({
    title: '删除用户',
    content: `确定删除用户「${row.account}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteUserMethod(row.id);
        message.success('删除成功');
        await fetchUsers();
      } catch (error) {
        message.error(getMappedErrorMessage(error, '删除失败'));
      }
    },
  });
};

const deleteBatchUsers = () => {
  const ids = checkedRowKeys.value.map((item) => Number(item));
  if (ids.length === 0) {
    message.warning('请先选择要删除的用户');
    return;
  }
  dialog.warning({
    title: '批量删除',
    content: `确定删除已选 ${ids.length} 个用户吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await batchDeleteUsersMethod(ids);
        checkedRowKeys.value = [];
        message.success('批量删除成功');
        await fetchUsers();
      } catch (error) {
        message.error(getMappedErrorMessage(error, '批量删除失败'));
      }
    },
  });
};

const rowKey = (row: UserRow) => row.id;

const rowSelection = computed(() => ({
  checkedRowKeys: checkedRowKeys.value,
  onUpdateCheckedRowKeys: (keys: DataTableRowKey[]) => {
    checkedRowKeys.value = keys;
  },
}));

onMounted(() => {
  void fetchUsers();
});
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
        <NButton
          v-permission="'system:user:create'"
          type="info"
          ghost
          @click="openCreateUserModal"
          >新增用户</NButton
        >
        <NButton
          v-permission="'system:user:delete'"
          type="warning"
          ghost
          @click="deleteBatchUsers"
          >批量删除</NButton
        >
        <NButton type="primary" :loading="loading" @click="fetchUsers"
          >查询</NButton
        >
      </NSpace>
      <NText v-if="errorText" type="error">{{ errorText }}</NText>
      <NEmpty
        v-if="!loading && !errorText && users.length === 0"
        description="暂无用户数据"
      />
      <NDataTable
        v-else
        :columns="columns"
        :data="users"
        :loading="loading"
        :pagination="pagination"
        :row-key="rowKey"
        :row-selection="rowSelection"
      />
    </NSpace>

    <NModal v-model:show="userModalVisible">
      <NCard
        style="width: 520px"
        :title="userModalMode === 'create' ? '新增用户' : '编辑用户'"
        :bordered="false"
      >
        <NForm label-placement="left" label-width="90">
          <NFormItem label="账号" required>
            <NInput v-model:value="userForm.account" placeholder="请输入账号" />
          </NFormItem>
          <NFormItem label="姓名" required>
            <NInput v-model:value="userForm.name" placeholder="请输入姓名" />
          </NFormItem>
          <NFormItem label="角色" required>
            <NSelect
              v-model:value="userForm.role"
              :options="roleOptions"
              placeholder="请选择角色"
            />
          </NFormItem>
        </NForm>
        <template #footer>
          <NSpace justify="end">
            <NButton @click="userModalVisible = false">取消</NButton>
            <NButton type="primary" :loading="saving" @click="submitUserForm"
              >保存</NButton
            >
          </NSpace>
        </template>
      </NCard>
    </NModal>
  </NCard>
</template>
