<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NSpace,
  NSelect,
  NTag,
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
import { getDeptTreeMethod, type DeptNode } from '../api/modules/dept';
import { getRolesMethod } from '../api/modules/role';
import { getMappedErrorMessage } from '../api/error-map';
import { useCrudActions } from '../composables/useCrudActions';
import { useListQuery } from '../composables/useListQuery';
import SearchBar from '../components/crud/SearchBar.vue';
import FormDrawer from '../components/crud/FormDrawer.vue';
import DataTablePage from '../components/crud/DataTablePage.vue';

type UserRow = User;

const total = ref(0);
const users = ref<UserRow[]>([]);
const saving = ref(false);
const checkedRowKeys = ref<DataTableRowKey[]>([]);

const dialog = useDialog();
const message = useMessage();
const { confirmAndRun } = useCrudActions({
  message,
  dialog,
  mapErrorMessage: getMappedErrorMessage,
});

const userModalVisible = ref(false);
const userModalMode = ref<'create' | 'edit'>('create');
const userForm = ref({
  id: 0,
  account: '',
  name: '',
  role: '' as User['role'],
  deptId: undefined as number | undefined,
});

const roleOptions = ref<Array<{ label: string; value: User['role'] }>>([]);
const deptOptions = ref<Array<{ label: string; value: number }>>([]);
const roleLabelMap = computed<Record<User['role'], string>>(() => {
  const defaults: Record<User['role'], string> = {
    admin: '管理员',
    editor: '编辑',
  };
  for (const item of roleOptions.value) {
    defaults[item.value] = item.label;
  }
  return defaults;
});

const deptLabelMap = computed(() => {
  const map = new Map<number, string>();
  for (const item of deptOptions.value) {
    map.set(item.value, item.label);
  }
  return map;
});

const columns: DataTableColumns<UserRow> = [
  {
    type: 'selection',
    width: 48,
  },
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
        { default: () => roleLabelMap.value[row.role] ?? row.role },
      ),
  },
  {
    title: '部门',
    key: 'deptName',
    render: (row) =>
      row.deptId
        ? (deptLabelMap.value.get(row.deptId) ?? row.deptName ?? '-')
        : '-',
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

const {
  query,
  loading,
  errorText,
  run: fetchUsers,
} = useListQuery({
  createInitialQuery: () => ({
    keyword: '',
    page: 1,
    pageSize: 10,
    deptId: null as number | null,
  }),
  request: (currentQuery) =>
    getUsersPageMethod({
      page: currentQuery.page,
      pageSize: currentQuery.pageSize,
      keyword: currentQuery.keyword || undefined,
      deptId: currentQuery.deptId ?? undefined,
    }),
  onSuccess: (response) => {
    users.value = response.data.list;
    total.value = response.data.total;
  },
  onError: (error) => {
    errorText.value = getMappedErrorMessage(error, '加载失败');
    users.value = [];
    total.value = 0;
  },
});

const pagination = computed(() => ({
  page: query.page,
  pageSize: query.pageSize,
  itemCount: total.value,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  onUpdatePage: (nextPage: number) => {
    query.page = nextPage;
    void fetchUsers();
  },
  onUpdatePageSize: (nextPageSize: number) => {
    query.pageSize = nextPageSize;
    query.page = 1;
    void fetchUsers();
  },
}));

const fetchRoleOptions = async () => {
  try {
    const response = await getRolesMethod();
    roleOptions.value = response.data
      .filter(
        (item): item is typeof item & { code: User['role'] } =>
          item.status === 1,
      )
      .map((item) => ({
        label: item.name,
        value: item.code,
      }));
    if (
      roleOptions.value.length > 0 &&
      !roleOptions.value.some((item) => item.value === userForm.value.role)
    ) {
      userForm.value.role = roleOptions.value[0].value;
    }
  } catch (error) {
    roleOptions.value = [];
    message.error(getMappedErrorMessage(error, '加载角色选项失败'));
  }
};

const walkDeptNodes = (
  nodes: DeptNode[],
  collector: Array<{ label: string; value: number }>,
  prefix = '',
) => {
  for (const node of nodes) {
    collector.push({
      label: `${prefix}${node.name}`,
      value: node.id,
    });
    if (node.children.length > 0) {
      walkDeptNodes(node.children, collector, `${prefix}${node.name} / `);
    }
  }
};

const fetchDeptOptions = async () => {
  try {
    const response = await getDeptTreeMethod();
    const options: Array<{ label: string; value: number }> = [];
    walkDeptNodes(response.data, options);
    deptOptions.value = options;
  } catch (error) {
    deptOptions.value = [];
    message.error(getMappedErrorMessage(error, '加载部门选项失败'));
  }
};

const openCreateUserModal = () => {
  userModalMode.value = 'create';
  userForm.value = {
    id: 0,
    account: '',
    name: '',
    role: roleOptions.value[0]?.value ?? '',
    deptId: deptOptions.value[0]?.value,
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
    deptId: row.deptId ?? undefined,
  };
  userModalVisible.value = true;
};

const submitUserForm = async () => {
  const account = userForm.value.account.trim();
  const name = userForm.value.name.trim();
  const role = userForm.value.role.trim();
  if (!account || !name || !role) {
    message.error('请填写账号、姓名并选择角色');
    return;
  }
  saving.value = true;
  try {
    if (userModalMode.value === 'create') {
      await createUserMethod({
        account,
        name,
        role: userForm.value.role,
        deptId: userForm.value.deptId,
      });
      message.success('用户创建成功');
    } else {
      await updateUserMethod(userForm.value.id, {
        account,
        name,
        role: userForm.value.role,
        deptId: userForm.value.deptId ?? null,
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
  confirmAndRun({
    title: '删除用户',
    content: `确定删除用户「${row.account}」吗？`,
    successMessage: '删除成功',
    errorMessage: '删除失败',
    execute: async () => {
      await deleteUserMethod(row.id);
    },
    onSuccess: fetchUsers,
  });
};

const deleteBatchUsers = () => {
  const ids = checkedRowKeys.value.map((item) => Number(item));
  if (ids.length === 0) {
    message.warning('请先选择要删除的用户');
    return;
  }
  confirmAndRun({
    title: '批量删除',
    content: `确定删除已选 ${ids.length} 个用户吗？`,
    successMessage: '批量删除成功',
    errorMessage: '批量删除失败',
    execute: async () => {
      await batchDeleteUsersMethod(ids);
      checkedRowKeys.value = [];
    },
    onSuccess: fetchUsers,
  });
};

const rowKey = (row: UserRow) => row.id;

const userTableProps = computed(() => ({
  checkedRowKeys: checkedRowKeys.value,
  onUpdateCheckedRowKeys: (keys: DataTableRowKey[]) => {
    checkedRowKeys.value = keys;
  },
}));

onMounted(() => {
  void fetchRoleOptions();
  void fetchDeptOptions();
  void fetchUsers();
});
</script>

<template>
  <DataTablePage
    title="用户管理"
    :loading="loading"
    :error-text="errorText"
    :empty="users.length === 0"
    empty-description="暂无用户数据"
    :columns="columns"
    :data="users"
    :pagination="pagination"
    :row-key="rowKey"
    :table-props="userTableProps"
  >
    <template #toolbar-left>
      <SearchBar>
        <NInput
          v-model:value="query.keyword"
          clearable
          placeholder="按账号或姓名搜索"
          style="width: 280px"
        />
        <NSelect
          v-model:value="query.deptId"
          :options="deptOptions"
          clearable
          placeholder="按部门筛选"
          style="width: 240px"
        />
        <NButton type="primary" :loading="loading" @click="fetchUsers"
          >查询</NButton
        >
      </SearchBar>
    </template>
    <template #toolbar-right>
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
        :disabled="checkedRowKeys.length === 0"
        @click="deleteBatchUsers"
        >批量删除</NButton
      >
    </template>
    <FormDrawer
      v-model:show="userModalVisible"
      :title="userModalMode === 'create' ? '新增用户' : '编辑用户'"
      :loading="saving"
      @save="submitUserForm"
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
            :disabled="roleOptions.length === 0"
            placeholder="请选择角色"
          />
        </NFormItem>
        <NFormItem label="部门">
          <NSelect
            v-model:value="userForm.deptId"
            :options="deptOptions"
            clearable
            placeholder="请选择部门"
          />
        </NFormItem>
      </NForm>
    </FormDrawer>
  </DataTablePage>
</template>
