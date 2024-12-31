// vite.config.js
import { defineConfig } from 'vite';
import { viteSingleFile } from "vite-plugin-singlefile"
export default defineConfig({
  plugins: [
    viteSingleFile()
  ],
  build: {
    target: 'es2022', // or 'esnext'
  },
  server: {
    proxy: {
      '^/fallback/.*': {
        target: 'http://jsonplaceholder.typicode.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fallback/, ''),
      },
    }
  }
});