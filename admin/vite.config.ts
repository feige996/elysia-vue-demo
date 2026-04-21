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
          manualChunks(id) {
            if (
              id.includes('/node_modules/vue/') ||
              id.includes('/node_modules/vue-router/') ||
              id.includes('/node_modules/pinia/')
            ) {
              return 'vendor-vue';
            }
            if (id.includes('/node_modules/naive-ui/')) {
              return 'vendor-ui';
            }
            if (id.includes('/node_modules/@elysiajs/eden/')) {
              return 'vendor-eden';
            }
            return undefined;
          },
        },
      },
    },
  };
});
