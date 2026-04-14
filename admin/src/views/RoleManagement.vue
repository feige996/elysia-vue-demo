<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import {
  NButton,
  NCard,
  NCheckbox,
  NCheckboxGroup,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSpace,
  NTag,
  useDialog,
  useMessage,
  type DataTableColumns,
} from 'naive-ui';
import {
  assignRoleMenusMethod,
  assignRolePermissionsMethod,
  createRoleMethod,
  deleteRoleMethod,
  getMenusMethod,
  getPermissionsMethod,
  getRolesMethod,
  updateRoleMethod,
  updateRoleStatusMethod,
  type MenuOption,
  type PermissionOption,
  type RoleRow,
} from '../api/modules/role';
import { getMappedErrorMessage } from '../api/error-map';
import SearchBar from '../components/crud/SearchBar.vue';
import TableToolbar from '../components/crud/TableToolbar.vue';
import FormDrawer from '../components/crud/FormDrawer.vue';
import UnifiedState from '../components/state/UnifiedState.vue';

const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const errorText = ref('');
const roles = ref<RoleRow[]>([]);
const saving = ref(false);

const roleModalVisible = ref(false);
const roleModalMode = ref<'create' | 'edit'>('create');
const roleForm = ref({
  id: 0,
  code: '',
  name: '',
  description: '',
});

const permissionModalVisible = ref(false);
const menuModalVisible = ref(false);
const selectedRole = ref<RoleRow | null>(null);
const permissionOptions = ref<PermissionOption[]>([]);
const menuOptions = ref<MenuOption[]>([]);
const selectedPermissionIds = ref<number[]>([]);
const selectedMenuIds = ref<number[]>([]);

const permissionEnabledOptions = computed(() =>
  permissionOptions.value.filter((item) => item.status === 1),
);
const menuEnabledOptions = computed(() =>
  menuOptions.value.filter((item) => item.status === 1),
);

const loadRoles = async () => {
  errorText.value = '';
  loading.value = true;
  try {
    const response = await getRolesMethod();
    roles.value = response.data;
  } catch (error) {
    errorText.value = getMappedErrorMessage(error, '加载失败');
    roles.value = [];
  } finally {
    loading.value = false;
  }
};

const ensurePermissionOptions = async () => {
  if (permissionOptions.value.length > 0) return;
  const response = await getPermissionsMethod();
  permissionOptions.value = response.data;
};

const ensureMenuOptions = async () => {
  if (menuOptions.value.length > 0) return;
  const response = await getMenusMethod();
  menuOptions.value = response.data;
};

const openCreateRoleModal = () => {
  roleModalMode.value = 'create';
  roleForm.value = {
    id: 0,
    code: '',
    name: '',
    description: '',
  };
  roleModalVisible.value = true;
};

const openEditRoleModal = (row: RoleRow) => {
  roleModalMode.value = 'edit';
  roleForm.value = {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? '',
  };
  roleModalVisible.value = true;
};

const submitRoleForm = async () => {
  if (!roleForm.value.code.trim() || !roleForm.value.name.trim()) {
    message.error('请填写角色编码和名称');
    return;
  }
  saving.value = true;
  try {
    if (roleModalMode.value === 'create') {
      await createRoleMethod({
        code: roleForm.value.code.trim(),
        name: roleForm.value.name.trim(),
        description: roleForm.value.description.trim() || null,
      });
      message.success('角色创建成功');
    } else {
      await updateRoleMethod(roleForm.value.id, {
        code: roleForm.value.code.trim(),
        name: roleForm.value.name.trim(),
        description: roleForm.value.description.trim() || null,
      });
      message.success('角色更新成功');
    }
    roleModalVisible.value = false;
    await loadRoles();
  } catch (error) {
    message.error(getMappedErrorMessage(error, '保存失败'));
  } finally {
    saving.value = false;
  }
};

const updateRoleStatus = async (row: RoleRow) => {
  const nextStatus = row.status === 1 ? 0 : 1;
  try {
    await updateRoleStatusMethod(row.id, nextStatus);
    message.success(nextStatus === 1 ? '角色已启用' : '角色已禁用');
    await loadRoles();
  } catch (error) {
    message.error(getMappedErrorMessage(error, '状态更新失败'));
  }
};

const deleteRole = (row: RoleRow) => {
  dialog.warning({
    title: '删除角色',
    content: `确定删除角色「${row.name}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteRoleMethod(row.id);
        message.success('删除成功');
        await loadRoles();
      } catch (error) {
        message.error(getMappedErrorMessage(error, '删除失败'));
      }
    },
  });
};

const openPermissionModal = async (row: RoleRow) => {
  selectedRole.value = row;
  selectedPermissionIds.value = [];
  try {
    await ensurePermissionOptions();
    permissionModalVisible.value = true;
  } catch (error) {
    message.error(getMappedErrorMessage(error, '加载权限失败'));
  }
};

const submitRolePermissions = async () => {
  if (!selectedRole.value) return;
  saving.value = true;
  try {
    await assignRolePermissionsMethod(
      selectedRole.value.id,
      selectedPermissionIds.value,
    );
    message.success('权限分配已保存');
    permissionModalVisible.value = false;
  } catch (error) {
    message.error(getMappedErrorMessage(error, '保存权限失败'));
  } finally {
    saving.value = false;
  }
};

const openMenuModal = async (row: RoleRow) => {
  selectedRole.value = row;
  selectedMenuIds.value = [];
  try {
    await ensureMenuOptions();
    menuModalVisible.value = true;
  } catch (error) {
    message.error(getMappedErrorMessage(error, '加载菜单失败'));
  }
};

const submitRoleMenus = async () => {
  if (!selectedRole.value) return;
  saving.value = true;
  try {
    await assignRoleMenusMethod(selectedRole.value.id, selectedMenuIds.value);
    message.success('菜单分配已保存');
    menuModalVisible.value = false;
  } catch (error) {
    message.error(getMappedErrorMessage(error, '保存菜单失败'));
  } finally {
    saving.value = false;
  }
};

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
  {
    title: '操作',
    key: 'actions',
    width: 420,
    render: (row) =>
      h(
        NSpace,
        { size: 6 },
        {
          default: () => [
            h(
              NButton,
              { size: 'small', onClick: () => openEditRoleModal(row) },
              { default: () => '编辑' },
            ),
            h(
              NButton,
              { size: 'small', onClick: () => void updateRoleStatus(row) },
              { default: () => (row.status === 1 ? '禁用' : '启用') },
            ),
            h(
              NButton,
              {
                size: 'small',
                type: 'info',
                ghost: true,
                onClick: () => void openPermissionModal(row),
              },
              { default: () => '分配权限' },
            ),
            h(
              NButton,
              {
                size: 'small',
                type: 'info',
                ghost: true,
                onClick: () => void openMenuModal(row),
              },
              { default: () => '分配菜单' },
            ),
            h(
              NButton,
              {
                size: 'small',
                type: 'error',
                ghost: true,
                onClick: () => deleteRole(row),
              },
              { default: () => '删除' },
            ),
          ],
        },
      ),
  },
];

onMounted(() => {
  void loadRoles();
});
</script>

<template>
  <NCard title="角色管理" :bordered="false">
    <NSpace vertical :size="12">
      <TableToolbar>
        <template #left>
          <SearchBar>
            <NButton type="default" :loading="loading" @click="loadRoles"
              >刷新</NButton
            >
          </SearchBar>
        </template>
        <template #right>
          <NButton type="primary" @click="openCreateRoleModal"
            >新增角色</NButton
          >
        </template>
      </TableToolbar>
      <UnifiedState
        :loading="loading"
        :error-text="errorText"
        :empty="roles.length === 0"
        empty-description="暂无角色数据"
      >
        <NDataTable
          :columns="columns"
          :data="roles"
          :loading="loading"
          :pagination="false"
        />
      </UnifiedState>
    </NSpace>

    <FormDrawer
      v-model:show="roleModalVisible"
      :title="roleModalMode === 'create' ? '新增角色' : '编辑角色'"
      :loading="saving"
      @save="submitRoleForm"
    >
      <NForm label-placement="left" label-width="90">
        <NFormItem label="角色编码" required>
          <NInput v-model:value="roleForm.code" placeholder="请输入角色编码" />
        </NFormItem>
        <NFormItem label="角色名称" required>
          <NInput v-model:value="roleForm.name" placeholder="请输入角色名称" />
        </NFormItem>
        <NFormItem label="说明">
          <NInput
            v-model:value="roleForm.description"
            type="textarea"
            placeholder="请输入角色说明"
          />
        </NFormItem>
      </NForm>
    </FormDrawer>

    <NModal v-model:show="permissionModalVisible">
      <NCard style="width: 680px" title="分配权限" :bordered="false">
        <NCheckboxGroup v-model:value="selectedPermissionIds">
          <NSpace vertical :size="6" style="max-height: 360px; overflow: auto">
            <NCheckbox
              v-for="item in permissionEnabledOptions"
              :key="item.id"
              :value="item.id"
            >
              {{ item.module }} / {{ item.name }}（{{ item.code }}）
            </NCheckbox>
          </NSpace>
        </NCheckboxGroup>
        <template #footer>
          <NSpace justify="end">
            <NButton @click="permissionModalVisible = false">取消</NButton>
            <NButton
              type="primary"
              :loading="saving"
              @click="submitRolePermissions"
              >保存</NButton
            >
          </NSpace>
        </template>
      </NCard>
    </NModal>

    <NModal v-model:show="menuModalVisible">
      <NCard style="width: 680px" title="分配菜单" :bordered="false">
        <NCheckboxGroup v-model:value="selectedMenuIds">
          <NSpace vertical :size="6" style="max-height: 360px; overflow: auto">
            <NCheckbox
              v-for="item in menuEnabledOptions"
              :key="item.id"
              :value="item.id"
            >
              {{ item.name }}（{{ item.path }}）
            </NCheckbox>
          </NSpace>
        </NCheckboxGroup>
        <template #footer>
          <NSpace justify="end">
            <NButton @click="menuModalVisible = false">取消</NButton>
            <NButton type="primary" :loading="saving" @click="submitRoleMenus"
              >保存</NButton
            >
          </NSpace>
        </template>
      </NCard>
    </NModal>
  </NCard>
</template>
