<template>
  <div class="auth-layout">
    <div class="auth-layout-content">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}

.auth-layout-content {
  width: 100%;
  max-width: 480px;
}
</style>
