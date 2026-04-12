import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const parsedPort = Number.parseInt(env.WEB_PORT ?? '', 10);
    const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 5173;

    return {
        plugins: [vue()],
        server: {
            port,
        },
    };
});
