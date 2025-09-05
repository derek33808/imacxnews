// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import netlify from '@astrojs/netlify';

// 强制在生产环境使用 netlify 适配器
const adapter = netlify();

// https://astro.build/config
export default defineConfig({
  // 启用服务端输出，确保 /api 路由在 preview/SSR 下可用
  output: 'server',
  adapter: adapter,
  devToolbar: {
    enabled: false
  },
  server: {
    port: 4321,
    host: true
  }
});