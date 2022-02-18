import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    legacy({
      targets: ['> 0.25%'],
    }),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: new URL('./index.html', import.meta.url).pathname,
        buzzer: new URL('./buzzer.html', import.meta.url).pathname,
        host: new URL('./host.html', import.meta.url).pathname,
      },
    },
  },
});
