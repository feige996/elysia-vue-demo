<script setup lang="ts">
import { reactive } from 'vue';
import { z } from 'zod';
import { NButton, NForm, NFormItem, NInput, NText } from 'naive-ui';
import { requestState, setAccessToken, setRefreshToken } from '../api/request';
import {
  loginMethod,
  type LoginPayload,
  type LoginResult,
} from '../api/modules/auth';
import { getMappedErrorMessage } from '../api/error-map';

const emit = defineEmits<{
  loginSuccess: [payload: LoginResult];
}>();

const formState = reactive<LoginPayload>({
  account: 'admin',
  password: 'admin123',
});

const errorMessage = reactive({
  text: '',
});

const loginFormSchema = z.object({
  account: z.string().min(1, '请输入账号'),
  password: z.string().min(6, '密码至少 6 位'),
});

const { loading, send } = requestState.useRequest(
  (payload: LoginPayload) => loginMethod(payload),
  {
    immediate: false,
  },
);

const submitLogin = async () => {
  errorMessage.text = '';
  const parsed = loginFormSchema.safeParse(formState);
  if (!parsed.success) {
    errorMessage.text = parsed.error.issues[0]?.message ?? '表单校验失败';
    return;
  }

  try {
    const response = await send({
      account: parsed.data.account,
      password: parsed.data.password,
    });
    setAccessToken(response.data.accessToken);
    setRefreshToken(response.data.refreshToken);
    emit('loginSuccess', response.data);
  } catch (error) {
    errorMessage.text = getMappedErrorMessage(error, '登录失败');
  }
};
</script>

<template>
  <NForm @submit.prevent="submitLogin">
    <NFormItem label="账号">
      <NInput v-model:value="formState.account" placeholder="admin" />
    </NFormItem>
    <NFormItem label="密码">
      <NInput
        v-model:value="formState.password"
        type="password"
        placeholder="admin123"
        show-password-on="click"
      />
    </NFormItem>
    <NFormItem>
      <NButton type="primary" :loading="loading" attr-type="submit" block
        >登录</NButton
      >
    </NFormItem>
  </NForm>
  <NText v-if="errorMessage.text" type="error">{{ errorMessage.text }}</NText>
</template>
