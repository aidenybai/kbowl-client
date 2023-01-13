import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: new URL('./index.html', import.meta.url).pathname,
        buzzer: new URL('./buzzer.html', import.meta.url).pathname,
        host: new URL('./host.html', import.meta.url).pathname,
        faq: new URL('./faq.html', import.meta.url).pathname,
        singleplayer: new URL('./singleplayer.html', import.meta.url).pathname,
      },
    },
  },
});
