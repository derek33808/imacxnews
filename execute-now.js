#!/usr/bin/env node

// 立即执行的图片同步脚本
console.log('🚀 正在启动图片数据库同步...\n');

import('./simple-sync.js')
  .then(() => {
    console.log('\n🎉 图片同步脚本执行完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 脚本执行失败:', error.message);
    console.error('详细错误信息:', error);
    process.exit(1);
  });
