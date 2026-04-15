<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import {
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NSpace,
  NText,
} from 'naive-ui';
import { getMappedErrorMessage } from '../api/error-map';
import {
  getProfileMethod,
  updateCurrentPasswordMethod,
  updateProfileMethod,
} from '../api/modules/auth';
import { useAuthStore } from '../store/auth';

const authStore = useAuthStore();
const loadingProfile = ref(false);
const savingProfile = ref(false);
const savingPassword = ref(false);
const profileError = ref('');
const profileSuccess = ref('');
const passwordError = ref('');
const passwordSuccess = ref('');

const profileForm = reactive({
  account: '',
  role: '',
  name: '',
  email: '',
  mobile: '',
  avatarUrl: '',
});

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
});

const loadProfile = async () => {
  loadingProfile.value = true;
  profileError.value = '';
  try {
    const response = await getProfileMethod();
    profileForm.account = response.data.account;
    profileForm.role = response.data.role ?? '';
    profileForm.name = response.data.name;
    profileForm.email = response.data.email ?? '';
    profileForm.mobile = response.data.mobile ?? '';
    profileForm.avatarUrl = response.data.avatarUrl ?? '';
  } catch (error) {
    profileError.value = getMappedErrorMessage(error, '获取个人资料失败');
  } finally {
    loadingProfile.value = false;
  }
};

const saveProfile = async () => {
  profileError.value = '';
  profileSuccess.value = '';
  savingProfile.value = true;
  try {
    const response = await updateProfileMethod({
      name: profileForm.name,
      email: profileForm.email || null,
      mobile: profileForm.mobile || null,
      avatarUrl: profileForm.avatarUrl || null,
    });
    profileForm.name = response.data.name;
    profileForm.email = response.data.email ?? '';
    profileForm.mobile = response.data.mobile ?? '';
    profileForm.avatarUrl = response.data.avatarUrl ?? '';
    authStore.patchProfile({ name: response.data.name });
    profileSuccess.value = '个人信息已更新';
  } catch (error) {
    profileError.value = getMappedErrorMessage(error, '更新个人资料失败');
  } finally {
    savingProfile.value = false;
  }
};

const savePassword = async () => {
  passwordError.value = '';
  passwordSuccess.value = '';
  if (passwordForm.currentPassword.length < 6) {
    passwordError.value = '请输入当前密码';
    return;
  }
  if (passwordForm.newPassword.length < 6) {
    passwordError.value = '新密码至少 6 位';
    return;
  }
  savingPassword.value = true;
  try {
    await updateCurrentPasswordMethod(passwordForm);
    passwordForm.currentPassword = '';
    passwordForm.newPassword = '';
    passwordSuccess.value = '密码更新成功';
  } catch (error) {
    passwordError.value = getMappedErrorMessage(error, '更新密码失败');
  } finally {
    savingPassword.value = false;
  }
};

onMounted(() => {
  void loadProfile();
});
</script>

<template>
  <NSpace vertical :size="16">
    <NCard title="个人资料" :loading="loadingProfile">
      <NForm label-placement="left" label-width="100">
        <NFormItem label="账号">
          <NInput v-model:value="profileForm.account" disabled />
        </NFormItem>
        <NFormItem label="角色">
          <NInput v-model:value="profileForm.role" disabled />
        </NFormItem>
        <NFormItem label="昵称">
          <NInput v-model:value="profileForm.name" />
        </NFormItem>
        <NFormItem label="邮箱">
          <NInput v-model:value="profileForm.email" />
        </NFormItem>
        <NFormItem label="手机号">
          <NInput v-model:value="profileForm.mobile" />
        </NFormItem>
        <NFormItem label="头像地址">
          <NInput v-model:value="profileForm.avatarUrl" />
        </NFormItem>
        <NButton type="primary" :loading="savingProfile" @click="saveProfile"
          >保存资料</NButton
        >
      </NForm>
      <NText v-if="profileSuccess" type="success">{{ profileSuccess }}</NText>
      <NText v-if="profileError" type="error">{{ profileError }}</NText>
    </NCard>

    <NCard title="修改密码">
      <NForm label-placement="left" label-width="100">
        <NFormItem label="当前密码">
          <NInput
            v-model:value="passwordForm.currentPassword"
            type="password"
            show-password-on="click"
          />
        </NFormItem>
        <NFormItem label="新密码">
          <NInput
            v-model:value="passwordForm.newPassword"
            type="password"
            show-password-on="click"
          />
        </NFormItem>
        <NButton type="primary" :loading="savingPassword" @click="savePassword"
          >更新密码</NButton
        >
      </NForm>
      <NText v-if="passwordSuccess" type="success">{{ passwordSuccess }}</NText>
      <NText v-if="passwordError" type="error">{{ passwordError }}</NText>
    </NCard>
  </NSpace>
</template>
