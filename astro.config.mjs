// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  // 启用服务端输出，确保 /api 路由在 preview/SSR 下可用
  output: 'server',
  adapter: netlify(),
  devToolbar: {
    enabled: false
  },
  server: {
    port: 4321,
    host: true
  }
});