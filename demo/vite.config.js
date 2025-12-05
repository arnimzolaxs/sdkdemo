import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@openvector/zoro-sdk': resolve(__dirname, '../packages/zoro-sdk/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});

