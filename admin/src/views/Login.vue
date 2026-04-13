<script setup lang="ts">
import { reactive } from 'vue';
import { z } from 'zod';
import { NButton, NCard, NForm, NFormItem, NInput, NText } from 'naive-ui';
import { loginMethod, requestState, setAccessToken, setRefreshToken, type LoginPayload, type LoginResult } from '../api/request';

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

const { loading, send } = requestState.useRequest((payload: LoginPayload) => loginMethod(payload), {
    immediate: false,
});

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
        errorMessage.text = error instanceof Error ? error.message : '登录失败';
    }
};
</script>

<template>
    <NCard title="Admin 登录" :bordered="false">
        <NForm @submit.prevent="submitLogin">
            <NFormItem label="账号">
                <NInput v-model:value="formState.account" placeholder="admin" />
            </NFormItem>
            <NFormItem label="密码">
                <NInput v-model:value="formState.password" type="password" placeholder="admin123" show-password-on="click" />
            </NFormItem>
            <NFormItem>
                <NButton type="primary" :loading="loading" attr-type="submit" block>登录</NButton>
            </NFormItem>
        </NForm>
        <NText v-if="errorMessage.text" type="error">{{ errorMessage.text }}</NText>
    </NCard>
</template>
