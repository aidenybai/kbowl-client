import { defineConfig } from 'vite';
import legacy from 'vite-plugin-legacy';

export default defineConfig({
  plugins: [
    legacy({
      targets: ['> 0.25%', 'last 2 versions', 'Firefox ESR', 'not dead'],
    }),
  ],
});
