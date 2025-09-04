// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import netlify from '@astrojs/netlify';

// 根据环境自动选择适配器：Netlify 环境使用 netlify，本地使用 node
const adapter = process.env.NETLIFY ? netlify() : node({ mode: 'standalone' });

// https://astro.build/config
export default defineConfig({
  // 启用服务端输出，确保 /api 路由在 preview/SSR 下可用
  output: 'server',
  adapter: adapter, // 使用条件适配器变量
  devToolbar: {
    enabled: false
  },
  server: {
    port: 4321,
    host: true
  }
});