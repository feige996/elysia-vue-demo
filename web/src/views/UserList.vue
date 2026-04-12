<script setup lang="ts">
import { ref } from "vue";
import { getUsersMethod, requestState, type User } from "../api/request";

const keyword = ref("");
const users = ref<User[]>([]);
const error = ref("");

const { loading, send } = requestState.useRequest(
  () => getUsersMethod(keyword.value || undefined),
  {
    immediate: false
  }
);

const searchUsers = async () => {
  error.value = "";
  try {
    const response = await send();
    users.value = response.data;
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : "Load users failed";
  }
};
</script>

<template>
  <section class="card">
    <h2>User List</h2>
    <div class="toolbar">
      <input v-model="keyword" placeholder="Search by account or name" />
      <button :disabled="loading" @click="searchUsers">
        {{ loading ? "Loading..." : "Search" }}
      </button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <ul class="list">
      <li v-for="user in users" :key="user.id">
        <strong>{{ user.name }}</strong>
        <span>{{ user.account }}</span>
        <em>{{ user.role }}</em>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.card {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}

.toolbar {
  display: flex;
  gap: 8px;
}

input {
  flex: 1;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px 10px;
}

button {
  border: none;
  background: #0ea5e9;
  color: #fff;
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
}

.list {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

li {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.error {
  color: #dc2626;
}
</style>
