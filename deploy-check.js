// Netlify 部署前检查脚本
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'

// 加载环境变量
config()

console.log('🚀 Netlify 部署前检查...\n')

// 1. 检查必需文件
console.log('📁 检查项目文件:')
const requiredFiles = [
  'netlify.toml',
  'astro.config.mjs',
  'package.json',
  'prisma/schema.prisma',
  'src/pages/api/health.ts'
]

let filesOk = true
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`)
  } else {
    console.log(`   ❌ ${file} (缺失)`)
    filesOk = false
  }
})

// 2. 检查环境变量
console.log('\n🔧 检查环境变量:')
const requiredEnvs = ['DATABASE_URL']
const recommendedEnvs = ['NODE_ENV', 'ENABLE_SMART_FALLBACK']

let envOk = true
requiredEnvs.forEach(env => {
  if (process.env[env]) {
    console.log(`   ✅ ${env} (已设置)`)
  } else {
    console.log(`   ❌ ${env} (必需但未设置)`)
    envOk = false
  }
})

recommendedEnvs.forEach(env => {
  if (process.env[env]) {
    console.log(`   ✅ ${env} = ${process.env[env]}`)
  } else {
    console.log(`   ⚠️  ${env} (推荐设置)`)
  }
})

// 3. 检查数据库 URL 格式
if (process.env.DATABASE_URL) {
  console.log('\n🔗 数据库 URL 分析:')
  try {
    const dbUrl = new URL(process.env.DATABASE_URL)
    const isPooler = dbUrl.port === '6543'
    const hasSSL = dbUrl.searchParams.get('sslmode') === 'require'
    const hasPgBouncer = dbUrl.searchParams.has('pgbouncer')
    
    console.log(`   协议: ${dbUrl.protocol}`)
    console.log(`   主机: ${dbUrl.hostname}`)
    console.log(`   端口: ${dbUrl.port} ${isPooler ? '✅ (Pooler)' : '⚠️  (建议使用6543)'}`)
    console.log(`   SSL: ${hasSSL ? '✅ require' : '❌ 建议启用SSL'}`)
    console.log(`   PgBouncer: ${hasPgBouncer ? '✅' : '⚠️  建议启用'}`)
    
    if (!isPooler || !hasSSL) {
      envOk = false
      console.log('\n💡 推荐的 DATABASE_URL 格式:')
      console.log('   postgresql://user:pass@hostname:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require')
    }
  } catch (error) {
    console.log(`   ❌ URL 格式错误: ${error.message}`)
    envOk = false
  }
}

// 4. 测试数据库连接
if (process.env.DATABASE_URL) {
  console.log('\n🔍 测试数据库连接:')
  try {
    const prisma = new PrismaClient()
    await prisma.$connect()
    console.log('   ✅ 数据库连接成功')
    
    const articleCount = await prisma.article.count()
    console.log(`   📰 文章数量: ${articleCount}`)
    
    await prisma.$disconnect()
  } catch (error) {
    console.log(`   ❌ 数据库连接失败: ${error.message}`)
    envOk = false
  }
}

// 5. 检查构建配置
console.log('\n🏗️  构建配置检查:')
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
if (packageJson.scripts && packageJson.scripts.build) {
  console.log(`   ✅ 构建脚本: ${packageJson.scripts.build}`)
} else {
  console.log('   ❌ 缺少构建脚本')
  filesOk = false
}

// 最终报告
console.log('\n📊 检查结果:')
console.log(`   文件检查: ${filesOk ? '✅' : '❌'}`)
console.log(`   环境变量: ${envOk ? '✅' : '❌'}`)

if (filesOk && envOk) {
  console.log('\n🎉 部署检查通过! 可以开始部署到 Netlify')
  console.log('\n📋 下一步:')
  console.log('   1. 提交代码到 Git')
  console.log('   2. 在 Netlify 中连接 GitHub 仓库')
  console.log('   3. 设置环境变量')
  console.log('   4. 触发部署')
  console.log('\n🔗 部署后测试:')
  console.log('   访问: https://your-site.netlify.app/api/health')
} else {
  console.log('\n⚠️  部署检查未通过，请修复上述问题后重试')
  
  if (!envOk && process.env.DATABASE_URL?.includes('sslmode=disable')) {
    console.log('\n🔧 快速修复建议:')
    console.log('   将 DATABASE_URL 中的 sslmode=disable 改为 sslmode=require')
  }
}
