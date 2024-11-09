// vite.config.js
import { defineConfig } from 'vite';
// import wasm from "vite-plugin-wasm";
export default defineConfig({
  // plugins: [
  //   wasm(),
  // ],
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