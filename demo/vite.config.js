import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@open-vector/zoro-sdk': resolve(__dirname, '../packages/zoro-sdk/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
