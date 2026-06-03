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
      }
    }
  }
});