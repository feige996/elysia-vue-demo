<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
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
  NText,
  useDialog,
  useMessage,
} from 'naive-ui';
import {
  createDictItemMethod,
  createDictTypeMethod,
  deleteDictItemMethod,
  deleteDictTypeMethod,
  getDictItemsByCodeMethod,
  getDictItemsMethod,
  getDictTypesMethod,
  getSystemConfigByKeyMethod,
  toggleDictItemMethod,
  toggleDictTypeMethod,
  updateDictItemMethod,
  updateDictTypeMethod,
  type DictItem,
  type DictType,
  type SystemConfig,
} from '../api/modules/dict-config';
import { getMappedErrorMessage } from '../api/error-map';
import DataTablePage from '../components/crud/DataTablePage.vue';
import FormDrawer from '../components/crud/FormDrawer.vue';
import SearchBar from '../components/crud/SearchBar.vue';
import { useAuthStore } from '../store/auth';

type DictItemRow = DictItem & { dictTypeId: number };

const message = useMessage();
const dialog = useDialog();
const authStore = useAuthStore();

const canUpdateDictType = computed(() =>
  authStore.hasPermission('dict:type:update'),
);
const canToggleDictType = computed(() =>
  authStore.hasPermission('dict:type:toggle'),
);
const canDeleteDictType = computed(() =>
  authStore.hasPermission('dict:type:delete'),
);

const canUpdateDictItem = computed(() =>
  authStore.hasPermission('dict:item:update'),
);
const canToggleDictItem = computed(() =>
  authStore.hasPermission('dict:item:toggle'),
);
const canDeleteDictItem = computed(() =>
  authStore.hasPermission('dict:item:delete'),
);

const loading = ref(false);
const errorText = ref('');

const dictCode = ref('sys_common_status');
const configKey = ref('system.theme.defaultMode');
const dictPreviewItems = ref<DictItem[]>([]);
const configData = ref<SystemConfig | null>(null);

const dictTypes = ref<DictType[]>([]);
const selectedDictTypeId = ref<number | null>(null);
const dictItems = ref<DictItemRow[]>([]);

const typeDrawerVisible = ref(false);
const typeDrawerMode = ref<'create' | 'edit'>('create');
const itemDrawerVisible = ref(false);
const itemDrawerMode = ref<'create' | 'edit'>('create');
const saving = ref(false);

const dictTypeForm = ref({
  id: 0,
  code: '',
  name: '',
  status: 1,
  remark: '',
});

const dictItemForm = ref({
  id: 0,
  dictTypeId: 0,
  label: '',
  value: '',
  tagType: '',
  sort: 0,
  status: 1,
  isDefault: 0,
  remark: '',
});

const dictTypeOptions = computed(() =>
  dictTypes.value.map((item) => ({
    label: `${item.name} (${item.code})`,
    value: item.id,
  })),
);

const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
];

const loadDictTypes = async () => {
  const response = await getDictTypesMethod();
  dictTypes.value = response.data;
  if (!selectedDictTypeId.value && response.data.length > 0) {
    selectedDictTypeId.value = response.data[0].id;
  }
};

const loadDictItems = async () => {
  if (!selectedDictTypeId.value) {
    dictItems.value = [];
    return;
  }
  const response = await getDictItemsMethod(selectedDictTypeId.value);
  dictItems.value = response.data;
};

const loadPreviewData = async () => {
  const [dictRes, configRes] = await Promise.all([
    getDictItemsByCodeMethod(dictCode.value),
    getSystemConfigByKeyMethod(configKey.value),
  ]);
  dictPreviewItems.value = dictRes.data;
  configData.value = configRes.data;
};

const loadAll = async () => {
  loading.value = true;
  errorText.value = '';
  try {
    await loadDictTypes();
    await Promise.all([loadDictItems(), loadPreviewData()]);
  } catch (error) {
    errorText.value = getMappedErrorMessage(error, '加载失败');
  } finally {
    loading.value = false;
  }
};

const refreshByTypeChange = async () => {
  loading.value = true;
  errorText.value = '';
  try {
    await loadDictItems();
  } catch (error) {
    errorText.value = getMappedErrorMessage(error, '加载字典项失败');
  } finally {
    loading.value = false;
  }
};

const openCreateTypeDrawer = () => {
  typeDrawerMode.value = 'create';
  dictTypeForm.value = {
    id: 0,
    code: '',
    name: '',
    status: 1,
    remark: '',
  };
  typeDrawerVisible.value = true;
};

const openEditTypeDrawer = (row: DictType) => {
  typeDrawerMode.value = 'edit';
  dictTypeForm.value = {
    id: row.id,
    code: row.code,
    name: row.name,
    status: row.status,
    remark: row.remark ?? '',
  };
  typeDrawerVisible.value = true;
};

const submitTypeForm = async () => {
  const code = dictTypeForm.value.code.trim();
  const name = dictTypeForm.value.name.trim();
  if (!code || !name) {
    message.error('请填写字典编码和名称');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      code,
      name,
      status: dictTypeForm.value.status,
      remark: dictTypeForm.value.remark.trim() || null,
    };
    if (typeDrawerMode.value === 'create') {
      await createDictTypeMethod(payload);
      message.success('字典类型创建成功');
    } else {
      await updateDictTypeMethod(dictTypeForm.value.id, payload);
      message.success('字典类型更新成功');
    }
    typeDrawerVisible.value = false;
    await loadAll();
  } catch (error) {
    message.error(getMappedErrorMessage(error, '保存字典类型失败'));
  } finally {
    saving.value = false;
  }
};

const toggleTypeStatus = async (row: DictType) => {
  const nextStatus = row.status === 1 ? 0 : 1;
  try {
    await toggleDictTypeMethod(row.id, nextStatus);
    message.success(nextStatus === 1 ? '字典类型已启用' : '字典类型已禁用');
    await loadAll();
  } catch (error) {
    message.error(getMappedErrorMessage(error, '更新状态失败'));
  }
};

const deleteType = (row: DictType) => {
  dialog.warning({
    title: '删除字典类型',
    content: `确定删除字典类型「${row.name}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteDictTypeMethod(row.id);
        message.success('删除成功');
        if (selectedDictTypeId.value === row.id) {
          selectedDictTypeId.value = null;
        }
        await loadAll();
      } catch (error) {
        message.error(getMappedErrorMessage(error, '删除失败'));
      }
    },
  });
};

const openCreateItemDrawer = () => {
  if (!selectedDictTypeId.value) {
    message.warning('请先选择字典类型');
    return;
  }
  itemDrawerMode.value = 'create';
  dictItemForm.value = {
    id: 0,
    dictTypeId: selectedDictTypeId.value,
    label: '',
    value: '',
    tagType: '',
    sort: 0,
    status: 1,
    isDefault: 0,
    remark: '',
  };
  itemDrawerVisible.value = true;
};

const openEditItemDrawer = (row: DictItemRow) => {
  itemDrawerMode.value = 'edit';
  dictItemForm.value = {
    id: row.id,
    dictTypeId: row.dictTypeId,
    label: row.label,
    value: row.value,
    tagType: row.tagType ?? '',
    sort: row.sort,
    status: row.status,
    isDefault: row.isDefault,
    remark: row.remark ?? '',
  };
  itemDrawerVisible.value = true;
};

const submitItemForm = async () => {
  const label = dictItemForm.value.label.trim();
  const value = dictItemForm.value.value.trim();
  if (!dictItemForm.value.dictTypeId || !label || !value) {
    message.error('请填写字典类型、标签和值');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      dictTypeId: dictItemForm.value.dictTypeId,
      label,
      value,
      tagType: dictItemForm.value.tagType.trim() || null,
      sort: dictItemForm.value.sort ?? 0,
      status: dictItemForm.value.status,
      isDefault: dictItemForm.value.isDefault,
      remark: dictItemForm.value.remark.trim() || null,
    };
    if (itemDrawerMode.value === 'create') {
      await createDictItemMethod(payload);
      message.success('字典项创建成功');
    } else {
      await updateDictItemMethod(dictItemForm.value.id, payload);
      message.success('字典项更新成功');
    }
    itemDrawerVisible.value = false;
    await loadDictItems();
    await loadPreviewData();
  } catch (error) {
    message.error(getMappedErrorMessage(error, '保存字典项失败'));
  } finally {
    saving.value = false;
  }
};

const toggleItemStatus = async (row: DictItemRow) => {
  const nextStatus = row.status === 1 ? 0 : 1;
  try {
    await toggleDictItemMethod(row.id, nextStatus);
    message.success(nextStatus === 1 ? '字典项已启用' : '字典项已禁用');
    await loadDictItems();
    await loadPreviewData();
  } catch (error) {
    message.error(getMappedErrorMessage(error, '更新状态失败'));
  }
};

const deleteItem = (row: DictItemRow) => {
  dialog.warning({
    title: '删除字典项',
    content: `确定删除字典项「${row.label}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteDictItemMethod(row.id);
        message.success('删除成功');
        await loadDictItems();
        await loadPreviewData();
      } catch (error) {
        message.error(getMappedErrorMessage(error, '删除失败'));
      }
    },
  });
};

const dictTypeColumns: DataTableColumns<DictType> = [
  { title: 'ID', key: 'id', width: 72 },
  { title: '编码', key: 'code', width: 180 },
  { title: '名称', key: 'name', width: 160 },
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
  { title: '备注', key: 'remark' },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    render: (row) =>
      h(
        NSpace,
        { size: 6 },
        {
          default: () =>
            [
              canUpdateDictType.value
                ? h(
                    NButton,
                    { size: 'small', onClick: () => openEditTypeDrawer(row) },
                    { default: () => '编辑' },
                  )
                : null,
              canToggleDictType.value
                ? h(
                    NButton,
                    {
                      size: 'small',
                      onClick: () => void toggleTypeStatus(row),
                    },
                    { default: () => (row.status === 1 ? '禁用' : '启用') },
                  )
                : null,
              canDeleteDictType.value
                ? h(
                    NButton,
                    {
                      size: 'small',
                      type: 'error',
                      ghost: true,
                      onClick: () => deleteType(row),
                    },
                    { default: () => '删除' },
                  )
                : null,
            ].filter((item): item is NonNullable<typeof item> => Boolean(item)),
        },
      ),
  },
];

const dictItemColumns: DataTableColumns<DictItemRow> = [
  { title: 'ID', key: 'id', width: 72 },
  { title: '标签', key: 'label', width: 140 },
  { title: '值', key: 'value', width: 120 },
  { title: '排序', key: 'sort', width: 90 },
  {
    title: '默认',
    key: 'isDefault',
    width: 90,
    render: (row) =>
      h(
        NTag,
        { type: row.isDefault === 1 ? 'success' : 'default', size: 'small' },
        { default: () => (row.isDefault === 1 ? '是' : '否') },
      ),
  },
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
  { title: '备注', key: 'remark' },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    render: (row) =>
      h(
        NSpace,
        { size: 6 },
        {
          default: () =>
            [
              canUpdateDictItem.value
                ? h(
                    NButton,
                    { size: 'small', onClick: () => openEditItemDrawer(row) },
                    { default: () => '编辑' },
                  )
                : null,
              canToggleDictItem.value
                ? h(
                    NButton,
                    {
                      size: 'small',
                      onClick: () => void toggleItemStatus(row),
                    },
                    { default: () => (row.status === 1 ? '禁用' : '启用') },
                  )
                : null,
              canDeleteDictItem.value
                ? h(
                    NButton,
                    {
                      size: 'small',
                      type: 'error',
                      ghost: true,
                      onClick: () => deleteItem(row),
                    },
                    { default: () => '删除' },
                  )
                : null,
            ].filter((item): item is NonNullable<typeof item> => Boolean(item)),
        },
      ),
  },
];

onMounted(() => {
  void loadAll();
});
</script>

<template>
  <NSpace vertical :size="12">
    <DataTablePage
      title="字典类型管理"
      :loading="loading"
      :error-text="errorText"
      :empty="dictTypes.length === 0"
      empty-description="暂无字典类型"
      :columns="dictTypeColumns"
      :data="dictTypes"
      :pagination="false"
      :table-props="{
        striped: true,
        maxHeight: 'max(200px, min(380px, calc((100vh - 420px) / 3)))',
      }"
    >
      <template #toolbar-left>
        <SearchBar>
          <NSelect
            v-model:value="selectedDictTypeId"
            style="width: 300px"
            placeholder="选择字典类型查看字典项"
            :options="dictTypeOptions"
            clearable
            @update:value="refreshByTypeChange"
          />
          <NButton :loading="loading" @click="loadAll">刷新</NButton>
        </SearchBar>
      </template>
      <template #toolbar-right>
        <NButton
          v-permission="'dict:type:create'"
          type="primary"
          @click="openCreateTypeDrawer"
          >新增字典类型</NButton
        >
      </template>
    </DataTablePage>

    <DataTablePage
      title="字典项管理"
      :loading="loading"
      :error-text="errorText"
      :empty="dictItems.length === 0"
      empty-description="当前类型暂无字典项"
      :columns="dictItemColumns"
      :data="dictItems"
      :pagination="false"
      :table-props="{
        striped: true,
        maxHeight: 'max(200px, min(380px, calc((100vh - 420px) / 3)))',
      }"
    >
      <template #toolbar-left>
        <NText depth="3"
          >当前类型：{{
            dictTypes.find((item) => item.id === selectedDictTypeId)?.name ??
            '未选择'
          }}</NText
        >
      </template>
      <template #toolbar-right>
        <NButton
          v-permission="'dict:item:create'"
          type="primary"
          @click="openCreateItemDrawer"
          >新增字典项</NButton
        >
      </template>
    </DataTablePage>

    <DataTablePage
      title="字典读取预览（兼容旧接口）"
      :loading="loading"
      :error-text="errorText"
      :empty="dictPreviewItems.length === 0"
      empty-description="暂无预览数据"
      :columns="dictItemColumns"
      :data="dictPreviewItems as unknown as DictItemRow[]"
      :pagination="false"
      :table-props="{
        striped: true,
        maxHeight: 'max(200px, min(380px, calc((100vh - 420px) / 3)))',
      }"
    >
      <template #toolbar-left>
        <SearchBar>
          <NInput
            v-model:value="dictCode"
            placeholder="字典编码（兼容旧读取接口）"
            style="width: 240px"
          />
          <NInput
            v-model:value="configKey"
            placeholder="系统配置键"
            style="width: 260px"
          />
          <NButton type="primary" :loading="loading" @click="loadPreviewData"
            >查询预览</NButton
          >
        </SearchBar>
      </template>
      <template #default>
        <NText depth="3" v-if="configData">
          系统配置：{{ configData.key }} =
          {{ JSON.stringify(configData.value) }}
        </NText>
      </template>
    </DataTablePage>
  </NSpace>

  <FormDrawer
    v-model:show="typeDrawerVisible"
    :title="typeDrawerMode === 'create' ? '新增字典类型' : '编辑字典类型'"
    :loading="saving"
    @save="submitTypeForm"
  >
    <NForm label-placement="left" label-width="90">
      <NFormItem label="字典编码" required>
        <NInput
          v-model:value="dictTypeForm.code"
          placeholder="例如 sys_status"
        />
      </NFormItem>
      <NFormItem label="字典名称" required>
        <NInput
          v-model:value="dictTypeForm.name"
          placeholder="请输入字典名称"
        />
      </NFormItem>
      <NFormItem label="状态">
        <NSelect
          v-model:value="dictTypeForm.status"
          :options="statusOptions"
          style="width: 160px"
        />
      </NFormItem>
      <NFormItem label="备注">
        <NInput
          v-model:value="dictTypeForm.remark"
          type="textarea"
          placeholder="备注（可选）"
        />
      </NFormItem>
    </NForm>
  </FormDrawer>

  <FormDrawer
    v-model:show="itemDrawerVisible"
    :title="itemDrawerMode === 'create' ? '新增字典项' : '编辑字典项'"
    :loading="saving"
    @save="submitItemForm"
  >
    <NForm label-placement="left" label-width="90">
      <NFormItem label="字典类型" required>
        <NSelect
          v-model:value="dictItemForm.dictTypeId"
          :options="dictTypeOptions"
          style="width: 320px"
        />
      </NFormItem>
      <NFormItem label="标签" required>
        <NInput v-model:value="dictItemForm.label" placeholder="请输入标签" />
      </NFormItem>
      <NFormItem label="值" required>
        <NInput v-model:value="dictItemForm.value" placeholder="请输入值" />
      </NFormItem>
      <NFormItem label="Tag 类型">
        <NInput
          v-model:value="dictItemForm.tagType"
          placeholder="success / warning / error"
        />
      </NFormItem>
      <NFormItem label="排序">
        <NInputNumber v-model:value="dictItemForm.sort" :min="0" :max="9999" />
      </NFormItem>
      <NFormItem label="状态">
        <NSelect
          v-model:value="dictItemForm.status"
          :options="statusOptions"
          style="width: 160px"
        />
      </NFormItem>
      <NFormItem label="默认">
        <NSelect
          v-model:value="dictItemForm.isDefault"
          :options="[
            { label: '否', value: 0 },
            { label: '是', value: 1 },
          ]"
          style="width: 160px"
        />
      </NFormItem>
      <NFormItem label="备注">
        <NInput
          v-model:value="dictItemForm.remark"
          type="textarea"
          placeholder="备注（可选）"
        />
      </NFormItem>
    </NForm>
  </FormDrawer>
</template>
