// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  adapter: node({ mode: 'standalone' }),
  devToolbar: {
    enabled: false
  },
  server: {
    port: 4321,
    host: true
  }
});