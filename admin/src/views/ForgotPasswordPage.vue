<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NCard, NForm, NFormItem, NInput, NText } from 'naive-ui';
import { z } from 'zod';
import { getMappedErrorMessage } from '../api/error-map';
import { forgotPasswordMethod } from '../api/modules/auth';

const router = useRouter();
const loading = ref(false);
const errorText = ref('');
const successText = ref('');

const formState = reactive({
  account: '',
  channel: 'email' as 'email' | 'sms',
});

const schema = z.object({
  account: z.string().min(1, '请输入账号'),
  channel: z.enum(['email', 'sms']),
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
    const response = await forgotPasswordMethod(parsed.data);
    successText.value = `验证码已发送到：${response.data.maskedTarget || '若账号存在则发送成功'}`;
  } catch (error) {
    errorText.value = getMappedErrorMessage(error, '获取重置令牌失败');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="auth-page">
    <NCard title="忘记密码" :bordered="false" class="auth-card">
      <NForm @submit.prevent="submit">
        <NFormItem label="账号">
          <NInput v-model:value="formState.account" placeholder="请输入账号" />
        </NFormItem>
        <NFormItem label="验证码通道">
          <NButton
            :type="formState.channel === 'email' ? 'primary' : 'default'"
            @click="formState.channel = 'email'"
            >邮箱</NButton
          >
          <NButton
            :type="formState.channel === 'sms' ? 'primary' : 'default'"
            @click="formState.channel = 'sms'"
            >短信</NButton
          >
        </NFormItem>
        <NFormItem>
          <NButton type="primary" block attr-type="submit" :loading="loading"
            >获取重置令牌</NButton
          >
        </NFormItem>
        <NButton text @click="router.push('/reset-password')"
          >去重置密码</NButton
        >
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
  width: 460px;
}
</style>
