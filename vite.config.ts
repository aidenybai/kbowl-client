import { defineConfig } from 'vite';
import legacy from 'vite-plugin-legacy';

export default defineConfig({
  plugins: [
    legacy({
      targets: ['> 0.25%', 'last 2 versions', 'Firefox ESR', 'not dead'],
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
