import { defineConfig } from 'vite';

export default defineConfig({
  base: '/outbound-intelligence-agent/',
  build: {
    outDir: 'docs',
    emptyOutDir: true
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
});
