<script setup lang="ts">
import { reactive } from 'vue';
import { z } from 'zod';
import { loginMethod, requestState, setAccessToken, type LoginPayload, type LoginResult } from '../api/request';

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
    account: z.string().min(1, 'Account is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

const { loading, send } = requestState.useRequest((payload: LoginPayload) => loginMethod(payload), {
    immediate: false,
});

const submitLogin = async () => {
    errorMessage.text = '';
    const parsed = loginFormSchema.safeParse(formState);
    if (!parsed.success) {
        errorMessage.text = parsed.error.issues[0]?.message ?? 'Invalid form';
        return;
    }

    try {
        const response = await send({
            account: parsed.data.account,
            password: parsed.data.password,
        });
        setAccessToken(response.data.token);
        emit('loginSuccess', response.data);
    } catch (error) {
        errorMessage.text = error instanceof Error ? error.message : 'Login failed';
    }
};
</script>

<template>
    <section class="card">
        <h2>Login</h2>
        <form class="form" @submit.prevent="submitLogin">
            <label>
                <span>Account</span>
                <input v-model="formState.account" placeholder="admin" />
            </label>
            <label>
                <span>Password</span>
                <input v-model="formState.password" type="password" placeholder="admin123" />
            </label>
            <button type="submit" :disabled="loading">
                {{ loading ? 'Submitting...' : 'Submit' }}
            </button>
            <p v-if="errorMessage.text" class="error">{{ errorMessage.text }}</p>
        </form>
    </section>
</template>

<style scoped>
.card {
    background: #fff;
    border-radius: 10px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}

.form {
    display: grid;
    gap: 10px;
}

label {
    display: grid;
    gap: 6px;
}

input {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 8px 10px;
}

button {
    border: none;
    background: #3b82f6;
    color: #fff;
    border-radius: 8px;
    padding: 10px;
    cursor: pointer;
}

button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.error {
    color: #dc2626;
    margin: 0;
}
</style>
