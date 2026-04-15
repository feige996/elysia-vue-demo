<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NRadio,
  NRadioGroup,
  NTag,
} from 'naive-ui';
import {
  getStorageConfigMethod,
  testStorageConfigMethod,
  updateStorageConfigMethod,
  type StorageConfigPayload,
} from '../api/modules/monitor';
import { getMappedErrorMessage } from '../api/error-map';

const loading = ref(false);
const saving = ref(false);
const testing = ref(false);
const errorText = ref('');
const testResult = ref<{ success: boolean; message: string } | null>(null);

const form = ref<StorageConfigPayload>({
  type: 'local',
  local: { baseDir: '', baseUrl: '' },
  oss: {
    region: '',
    accessKeyId: '',
    accessKeySecret: '',
    bucket: '',
    cdnUrl: '',
  },
  cos: {
    secretId: '',
    secretKey: '',
    bucket: '',
    region: '',
    cdnUrl: '',
  },
});

const masked = ref<StorageConfigPayload | null>(null);
const providerReady = ref(false);

const loadConfig = async () => {
  loading.value = true;
  errorText.value = '';
  try {
    const response = await getStorageConfigMethod();
    form.value = response.data.effective;
    masked.value = response.data.masked;
    providerReady.value = response.data.providerReady;
  } catch (error) {
    errorText.value = getMappedErrorMessage(error, '加载存储配置失败');
  } finally {
    loading.value = false;
  }
};

const saveConfig = async () => {
  saving.value = true;
  errorText.value = '';
  try {
    const response = await updateStorageConfigMethod(form.value);
    form.value = response.data.effective;
    masked.value = response.data.masked;
  } catch (error) {
    errorText.value = getMappedErrorMessage(error, '保存存储配置失败');
  } finally {
    saving.value = false;
  }
};

const testConfig = async () => {
  testing.value = true;
  errorText.value = '';
  testResult.value = null;
  try {
    const response = await testStorageConfigMethod(form.value);
    testResult.value = {
      success: response.data.success,
      message: response.data.message,
    };
  } catch (error) {
    const message = getMappedErrorMessage(error, '联通性测试失败');
    errorText.value = message;
    testResult.value = { success: false, message };
  } finally {
    testing.value = false;
  }
};

const isLocal = computed(() => form.value.type === 'local');
const isOss = computed(() => form.value.type === 'oss');
const isCos = computed(() => form.value.type === 'cos');

onMounted(() => {
  void loadConfig();
});
</script>

<template>
  <NCard title="存储管理中心" :bordered="false">
    <NForm label-placement="left" label-width="140">
      <NFormItem label="当前存储类型">
        <NRadioGroup v-model:value="form.type">
          <NRadio value="local">Local</NRadio>
          <NRadio value="oss">OSS</NRadio>
          <NRadio value="cos">COS</NRadio>
        </NRadioGroup>
        <NTag
          style="margin-left: 12px"
          :type="providerReady ? 'success' : 'warning'"
        >
          {{ providerReady ? '当前 Provider 可用' : '当前 Provider 未就绪' }}
        </NTag>
      </NFormItem>

      <template v-if="isLocal">
        <NFormItem label="Local 基础目录">
          <NInput v-model:value="form.local.baseDir" placeholder="uploads" />
        </NFormItem>
        <NFormItem label="Local 访问地址">
          <NInput v-model:value="form.local.baseUrl" />
        </NFormItem>
      </template>

      <template v-if="isOss">
        <NFormItem label="OSS Region">
          <NInput v-model:value="form.oss.region" />
        </NFormItem>
        <NFormItem label="OSS AccessKeyId">
          <NInput v-model:value="form.oss.accessKeyId" />
        </NFormItem>
        <NFormItem label="OSS AccessKeySecret">
          <NInput
            v-model:value="form.oss.accessKeySecret"
            type="password"
            show-password-on="click"
          />
        </NFormItem>
        <NFormItem label="OSS Bucket">
          <NInput v-model:value="form.oss.bucket" />
        </NFormItem>
        <NFormItem label="OSS CDN URL">
          <NInput v-model:value="form.oss.cdnUrl" />
        </NFormItem>
      </template>

      <template v-if="isCos">
        <NFormItem label="COS SecretId">
          <NInput v-model:value="form.cos.secretId" />
        </NFormItem>
        <NFormItem label="COS SecretKey">
          <NInput
            v-model:value="form.cos.secretKey"
            type="password"
            show-password-on="click"
          />
        </NFormItem>
        <NFormItem label="COS Bucket">
          <NInput v-model:value="form.cos.bucket" />
        </NFormItem>
        <NFormItem label="COS Region">
          <NInput v-model:value="form.cos.region" />
        </NFormItem>
        <NFormItem label="COS CDN URL">
          <NInput v-model:value="form.cos.cdnUrl" />
        </NFormItem>
      </template>

      <NFormItem label=" ">
        <div style="display: flex; gap: 8px; align-items: center">
          <NButton type="primary" :loading="saving" @click="saveConfig"
            >保存配置</NButton
          >
          <NButton :loading="testing" @click="testConfig">联通性测试</NButton>
          <NButton tertiary :loading="loading" @click="loadConfig"
            >重载</NButton
          >
          <NTag
            v-if="testResult"
            :type="testResult.success ? 'success' : 'error'"
          >
            {{ testResult.message }}
          </NTag>
        </div>
      </NFormItem>
    </NForm>

    <NCard
      v-if="masked"
      title="敏感信息预览（脱敏）"
      size="small"
      style="margin-top: 16px"
    >
      <pre style="margin: 0; white-space: pre-wrap">{{
        JSON.stringify(masked, null, 2)
      }}</pre>
    </NCard>
    <NTag v-if="errorText" type="error" style="margin-top: 12px">{{
      errorText
    }}</NTag>
  </NCard>
</template>
