<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NCard, NForm, NFormItem, NInput, NText } from 'naive-ui';
import { z } from 'zod';
import { getMappedErrorMessage } from '../api/error-map';
import { registerMethod } from '../api/modules/auth';

const router = useRouter();
const loading = ref(false);
const errorText = ref('');
const successText = ref('');

const formState = reactive({
  account: '',
  name: '',
  password: '',
});

const schema = z.object({
  account: z.string().min(3, '账号至少 3 位'),
  name: z.string().min(1, '请输入昵称'),
  password: z.string().min(6, '密码至少 6 位'),
});

const submit = async () => {
  errorText.value = '';
  successText.value = '';
  const parsed = schema.safeParse(formState);
  if (!parsed.success) {
    errorText.value = parsed.error.issues[0]?.message ?? '表单校验失败';
    return;
  }
  loading.value = true;
  try {
    await registerMethod(parsed.data);
    successText.value = '注册成功，请返回登录';
  } catch (error) {
    errorText.value = getMappedErrorMessage(error, '注册失败');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="auth-page">
    <NCard title="注册账号" :bordered="false" class="auth-card">
      <NForm @submit.prevent="submit">
        <NFormItem label="账号">
          <NInput v-model:value="formState.account" placeholder="请输入账号" />
        </NFormItem>
        <NFormItem label="昵称">
          <NInput v-model:value="formState.name" placeholder="请输入昵称" />
        </NFormItem>
        <NFormItem label="密码">
          <NInput
            v-model:value="formState.password"
            type="password"
            show-password-on="click"
            placeholder="请输入密码"
          />
        </NFormItem>
        <NFormItem>
          <NButton type="primary" block attr-type="submit" :loading="loading"
            >提交注册</NButton
          >
        </NFormItem>
        <NButton text @click="router.replace('/login')">返回登录</NButton>
      </NForm>
      <NText v-if="successText" type="success">{{ successText }}</NText>
      <NText v-if="errorText" type="error">{{ errorText }}</NText>
    </NCard>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.auth-card {
  width: 420px;
}
</style>
