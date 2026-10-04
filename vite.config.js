import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createTranslateMiddleware } from './server/translate/middleware.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      {
        name: 'talkie-translate-dev-api',
        configureServer(server) {
          server.middlewares.use('/api/translate', createTranslateMiddleware(env));
        },
      },
    ],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
      passWithNoTests: true,
    },
  };
});
