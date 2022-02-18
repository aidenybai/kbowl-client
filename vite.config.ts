import { defineConfig } from 'vite';

export default defineConfig({
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
