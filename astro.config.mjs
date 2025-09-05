// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import netlify from '@astrojs/netlify';

// 🚀 智能适配器选择：开发环境和预览环境使用 Node.js，生产环境使用 Netlify
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('dev');
const isPreview = process.env.NODE_ENV === 'preview' || process.argv.includes('preview');
const useNodeAdapter = isDev || isPreview;
const adapter = useNodeAdapter ? node({ mode: 'standalone' }) : netlify();

const envType = isDev ? 'development' : isPreview ? 'preview' : 'production';
console.log(`🚀 Using ${useNodeAdapter ? 'Node.js' : 'Netlify'} adapter for ${envType}`);

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
  },
  // 🚀 开发环境优化
  vite: {
    define: {
      __DEV__: isDev
    }
  }
});