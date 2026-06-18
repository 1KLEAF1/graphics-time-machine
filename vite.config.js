import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        pong: resolve(__dirname, 'pong.html'),
        raster: resolve(__dirname, 'raster.html'),
        raycasting: resolve(__dirname, 'raycasting.html'),
        raymarching: resolve(__dirname, 'raymarching.html'),
        raytracing: resolve(__dirname, 'raytracing.html'),
        login: resolve(__dirname, 'login.html'),
        admin: resolve(__dirname, 'profile.html')
      }
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
});