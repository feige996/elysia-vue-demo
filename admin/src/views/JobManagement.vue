<script setup lang="ts">
import { h, onMounted, ref } from 'vue';
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NSpace,
  NTag,
  useMessage,
  type DataTableColumns,
} from 'naive-ui';
import {
  createJobMethod,
  getJobsMethod,
  runJobMethod,
  toggleJobMethod,
  updateJobMethod,
  type JobItem,
} from '../api/modules/monitor';
import { getMappedErrorMessage } from '../api/error-map';
import DataTablePage from '../components/crud/DataTablePage.vue';
import FormDrawer from '../components/crud/FormDrawer.vue';
import SearchBar from '../components/crud/SearchBar.vue';

const message = useMessage();

const loading = ref(false);
const saving = ref(false);
const errorText = ref('');
const rows = ref<JobItem[]>([]);

const drawerVisible = ref(false);
const drawerMode = ref<'create' | 'edit'>('create');
const form = ref({
  id: 0,
  name: '',
  cron: '',
  status: 1,
  args: '',
  remark: '',
});

const loadJobs = async () => {
  loading.value = true;
  errorText.value = '';
  try {
    const response = await getJobsMethod();
    rows.value = response.data;
  } catch (error) {
    errorText.value = getMappedErrorMessage(error, '加载任务列表失败');
    rows.value = [];
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  drawerMode.value = 'create';
  form.value = {
    id: 0,
    name: '',
    cron: '',
    status: 1,
    args: '',
    remark: '',
  };
  drawerVisible.value = true;
};

const openEdit = (row: JobItem) => {
  drawerMode.value = 'edit';
  form.value = {
    id: row.id,
    name: row.name,
    cron: row.cron,
    status: row.status,
    args: row.args ?? '',
    remark: row.remark ?? '',
  };
  drawerVisible.value = true;
};

const submitForm = async () => {
  const name = form.value.name.trim();
  const cron = form.value.cron.trim();
  if (!name || !cron) {
    message.error('请填写任务名称和 Cron 表达式');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      name,
      cron,
      status: form.value.status,
      args: form.value.args.trim() || undefined,
      remark: form.value.remark.trim() || undefined,
    };
    if (drawerMode.value === 'create') {
      await createJobMethod(payload);
      message.success('任务创建成功');
    } else {
      await updateJobMethod(form.value.id, payload);
      message.success('任务更新成功');
    }
    drawerVisible.value = false;
    await loadJobs();
  } catch (error) {
    message.error(getMappedErrorMessage(error, '保存任务失败'));
  } finally {
    saving.value = false;
  }
};

const toggleJob = async (row: JobItem) => {
  const nextStatus = row.status === 1 ? 0 : 1;
  try {
    await toggleJobMethod(row.id, nextStatus);
    message.success(nextStatus === 1 ? '任务已启用' : '任务已禁用');
    await loadJobs();
  } catch (error) {
    message.error(getMappedErrorMessage(error, '更新任务状态失败'));
  }
};

const runJob = async (row: JobItem) => {
  try {
    await runJobMethod(row.id);
    message.success('任务触发成功');
    await loadJobs();
  } catch (error) {
    message.error(getMappedErrorMessage(error, '触发任务失败'));
  }
};

const columns: DataTableColumns<JobItem> = [
  { title: '名称', key: 'name', width: 180 },
  { title: 'Cron', key: 'cron', width: 150 },
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
    title: '执行次数',
    key: 'runCount',
    width: 100,
  },
  {
    title: '最近执行',
    key: 'lastRunAt',
    width: 170,
    render: (row) => row.lastRunAt ?? '-',
  },
  {
    title: '下次执行',
    key: 'nextRunAt',
    width: 170,
    render: (row) => row.nextRunAt ?? '-',
  },
  {
    title: '结果',
    key: 'lastRunMessage',
    ellipsis: { tooltip: true },
  },
  {
    title: '操作',
    key: 'actions',
    width: 260,
    render: (row) =>
      h(
        NSpace,
        { size: 6 },
        {
          default: () => [
            h(
              NButton,
              { size: 'small', onClick: () => openEdit(row) },
              { default: () => '编辑' },
            ),
            h(
              NButton,
              { size: 'small', onClick: () => void toggleJob(row) },
              { default: () => (row.status === 1 ? '禁用' : '启用') },
            ),
            h(
              NButton,
              {
                size: 'small',
                type: 'primary',
                ghost: true,
                onClick: () => void runJob(row),
              },
              { default: () => '立即执行' },
            ),
          ],
        },
      ),
  },
];

onMounted(() => {
  void loadJobs();
});
</script>

<template>
  <DataTablePage
    title="任务中心"
    :loading="loading"
    :error-text="errorText"
    :empty="rows.length === 0"
    empty-description="暂无任务配置"
    :columns="columns"
    :data="rows"
    :pagination="false"
  >
    <template #toolbar-left>
      <SearchBar>
        <NButton :loading="loading" @click="loadJobs">刷新</NButton>
      </SearchBar>
    </template>
    <template #toolbar-right>
      <NButton type="primary" @click="openCreate">新增任务</NButton>
    </template>
  </DataTablePage>

  <FormDrawer
    v-model:show="drawerVisible"
    :title="drawerMode === 'create' ? '新增任务' : '编辑任务'"
    :loading="saving"
    @save="submitForm"
  >
    <NForm label-placement="left" label-width="90">
      <NFormItem label="任务名称" required>
        <NInput v-model:value="form.name" placeholder="请输入任务名称" />
      </NFormItem>
      <NFormItem label="Cron" required>
        <NInput v-model:value="form.cron" placeholder="例如 0 8 * * *" />
      </NFormItem>
      <NFormItem label="状态">
        <NTag :type="form.status === 1 ? 'success' : 'default'">
          {{ form.status === 1 ? '启用' : '禁用' }}
        </NTag>
        <NButton
          text
          type="primary"
          @click="form.status = form.status === 1 ? 0 : 1"
        >
          切换
        </NButton>
      </NFormItem>
      <NFormItem label="参数">
        <NInput
          v-model:value="form.args"
          type="textarea"
          placeholder="JSON 字符串（可选）"
        />
      </NFormItem>
      <NFormItem label="备注">
        <NInput
          v-model:value="form.remark"
          type="textarea"
          placeholder="备注（可选）"
        />
      </NFormItem>
    </NForm>
  </FormDrawer>
</template>
