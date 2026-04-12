<script setup lang="ts">
import { computed, ref } from 'vue';
import Login from './views/Login.vue';
import UserList from './views/UserList.vue';
import { clearAccessToken, clearRefreshToken, type LoginResult } from './api/request';

const profile = ref<LoginResult['user'] | null>(null);

const welcomeText = computed(() => (profile.value ? `Welcome, ${profile.value.name}` : 'Not logged in'));

const onLoginSuccess = (payload: LoginResult) => {
    profile.value = payload.user;
};

const logout = () => {
    clearAccessToken();
    clearRefreshToken();
    profile.value = null;
};
</script>

<template>
    <main class="container">
        <header class="header">
            <h1>Vue3 + Elysia + Bun + Alova</h1>
            <div class="status">
                <span>{{ welcomeText }}</span>
                <button v-if="profile" @click="logout">Logout</button>
            </div>
        </header>

        <Login v-if="!profile" @login-success="onLoginSuccess" />
        <UserList v-else />
    </main>
</template>

<style scoped>
.container {
    max-width: 820px;
    margin: 24px auto;
    display: grid;
    gap: 16px;
    padding: 0 16px;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.status {
    display: flex;
    align-items: center;
    gap: 10px;
}

button {
    border: none;
    border-radius: 8px;
    background: #ef4444;
    color: #fff;
    padding: 8px 12px;
    cursor: pointer;
}
</style>
