<script setup lang="ts">
import { h, onMounted, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NSpace,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui';
import {
  createDeptMethod,
  deleteDeptMethod,
  getDeptTreeMethod,
  toggleDeptMethod,
  updateDeptMethod,
  type DeptNode,
} from '../api/modules/dept';
import { getMappedErrorMessage } from '../api/error-map';
import { useCrudActions } from '../composables/useCrudActions';
import DataTablePage from '../components/crud/DataTablePage.vue';
import FormDrawer from '../components/crud/FormDrawer.vue';
import SearchBar from '../components/crud/SearchBar.vue';

const message = useMessage();
const dialog = useDialog();
const { runWithFeedback, confirmAndRun } = useCrudActions({
  message,
  dialog,
  mapErrorMessage: getMappedErrorMessage,
});

const loading = ref(false);
const saving = ref(false);
const errorText = ref('');
const treeData = ref<DeptNode[]>([]);

const drawerVisible = ref(false);
const drawerMode = ref<'create' | 'edit'>('create');
const deptForm = ref({
  id: 0,
  parentId: 0,
  name: '',
  code: '',
  sort: 0,
  status: 1,
  leader: '',
  phone: '',
  email: '',
});

const parentOptions = ref<Array<{ label: string; value: number }>>([
  { label: '顶级部门', value: 0 },
]);

const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
];

const flattenDeptNodes = (nodes: DeptNode[], list: DeptNode[] = []) => {
  for (const node of nodes) {
    list.push(node);
    if (node.children.length > 0) {
      flattenDeptNodes(node.children, list);
    }
  }
  return list;
};

const refreshParentOptions = () => {
  const allNodes = flattenDeptNodes(treeData.value, []);
  parentOptions.value = [
    { label: '顶级部门', value: 0 },
    ...allNodes.map((item) => ({
      label: `${item.name} (${item.code})`,
      value: item.id,
    })),
  ];
};

const loadTree = async () => {
  loading.value = true;
  errorText.value = '';
  try {
    const response = await getDeptTreeMethod();
    treeData.value = response.data;
    refreshParentOptions();
  } catch (error) {
    errorText.value = getMappedErrorMessage(error, '加载部门树失败');
    treeData.value = [];
  } finally {
    loading.value = false;
  }
};

const openCreateDrawer = (parentId = 0) => {
  drawerMode.value = 'create';
  deptForm.value = {
    id: 0,
    parentId,
    name: '',
    code: '',
    sort: 0,
    status: 1,
    leader: '',
    phone: '',
    email: '',
  };
  drawerVisible.value = true;
};

const openEditDrawer = (row: DeptNode) => {
  drawerMode.value = 'edit';
  deptForm.value = {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    code: row.code,
    sort: row.sort,
    status: row.status,
    leader: row.leader ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
  };
  drawerVisible.value = true;
};

const submitDeptForm = async () => {
  const name = deptForm.value.name.trim();
  const code = deptForm.value.code.trim();
  if (!name || !code) {
    message.error('请填写部门名称和编码');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      parentId: deptForm.value.parentId,
      name,
      code,
      sort: deptForm.value.sort ?? 0,
      status: deptForm.value.status,
      leader: deptForm.value.leader.trim() || null,
      phone: deptForm.value.phone.trim() || null,
      email: deptForm.value.email.trim() || null,
    };
    if (drawerMode.value === 'create') {
      await createDeptMethod(payload);
      message.success('部门创建成功');
    } else {
      await updateDeptMethod(deptForm.value.id, payload);
      message.success('部门更新成功');
    }
    drawerVisible.value = false;
    await loadTree();
  } catch (error) {
    message.error(getMappedErrorMessage(error, '保存部门失败'));
  } finally {
    saving.value = false;
  }
};

const toggleStatus = async (row: DeptNode) => {
  const nextStatus = row.status === 1 ? 0 : 1;
  await runWithFeedback({
    execute: async () => {
      await toggleDeptMethod(row.id, nextStatus);
    },
    successMessage: nextStatus === 1 ? '部门已启用' : '部门已禁用',
    errorMessage: '更新部门状态失败',
    onSuccess: loadTree,
  });
};

const deleteDept = (row: DeptNode) => {
  confirmAndRun({
    title: '删除部门',
    content: `确定删除部门「${row.name}」吗？`,
    successMessage: '删除成功',
    errorMessage: '删除部门失败',
    execute: async () => {
      await deleteDeptMethod(row.id);
    },
    onSuccess: loadTree,
  });
};

const columns: DataTableColumns<DeptNode> = [
  { title: '部门名称', key: 'name', width: 220 },
  { title: '编码', key: 'code', width: 140 },
  { title: '负责人', key: 'leader', width: 120 },
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
  { title: '排序', key: 'sort', width: 80 },
  {
    title: '操作',
    key: 'actions',
    width: 300,
    render: (row) =>
      h(
        NSpace,
        { size: 6 },
        {
          default: () => [
            h(
              NButton,
              { size: 'small', onClick: () => openCreateDrawer(row.id) },
              { default: () => '新增子部门' },
            ),
            h(
              NButton,
              { size: 'small', onClick: () => openEditDrawer(row) },
              { default: () => '编辑' },
            ),
            h(
              NButton,
              { size: 'small', onClick: () => void toggleStatus(row) },
              { default: () => (row.status === 1 ? '禁用' : '启用') },
            ),
            h(
              NButton,
              {
                size: 'small',
                type: 'error',
                ghost: true,
                onClick: () => deleteDept(row),
              },
              { default: () => '删除' },
            ),
          ],
        },
      ),
  },
];

onMounted(() => {
  void loadTree();
});
</script>

<template>
  <DataTablePage
    title="部门管理"
    :loading="loading"
    :error-text="errorText"
    :empty="treeData.length === 0"
    empty-description="暂无部门数据"
    :columns="columns"
    :data="treeData"
    :pagination="false"
    :table-props="{ childrenKey: 'children' }"
  >
    <template #toolbar-left>
      <SearchBar>
        <NButton :loading="loading" @click="loadTree">刷新</NButton>
      </SearchBar>
    </template>
    <template #toolbar-right>
      <NButton type="primary" @click="openCreateDrawer()">新增部门</NButton>
    </template>
  </DataTablePage>

  <FormDrawer
    v-model:show="drawerVisible"
    :title="drawerMode === 'create' ? '新增部门' : '编辑部门'"
    :loading="saving"
    @save="submitDeptForm"
  >
    <NForm label-placement="left" label-width="90">
      <NFormItem label="上级部门">
        <NSelect
          v-model:value="deptForm.parentId"
          :options="parentOptions"
          style="width: 320px"
        />
      </NFormItem>
      <NFormItem label="部门名称" required>
        <NInput v-model:value="deptForm.name" placeholder="请输入部门名称" />
      </NFormItem>
      <NFormItem label="部门编码" required>
        <NInput v-model:value="deptForm.code" placeholder="请输入部门编码" />
      </NFormItem>
      <NFormItem label="负责人">
        <NInput v-model:value="deptForm.leader" placeholder="请输入负责人" />
      </NFormItem>
      <NFormItem label="手机号">
        <NInput v-model:value="deptForm.phone" placeholder="请输入手机号" />
      </NFormItem>
      <NFormItem label="邮箱">
        <NInput v-model:value="deptForm.email" placeholder="请输入邮箱" />
      </NFormItem>
      <NFormItem label="排序">
        <NInputNumber v-model:value="deptForm.sort" :min="0" :max="9999" />
      </NFormItem>
      <NFormItem label="状态">
        <NSelect
          v-model:value="deptForm.status"
          :options="statusOptions"
          style="width: 160px"
        />
      </NFormItem>
    </NForm>
  </FormDrawer>
</template>
