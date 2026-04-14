import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const parsedPort = Number.parseInt(env.ADMIN_PORT ?? '', 10);
  const port =
    Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 7000;

  return {
    plugins: [vue()],
    server: {
      port,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-vue': ['vue', 'vue-router', 'pinia'],
            'vendor-ui': ['naive-ui'],
            'vendor-eden': ['@elysiajs/eden'],
          },
        },
      },
    },
  };
});
