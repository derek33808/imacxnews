# 部署指南

## 必需的环境变量

在部署前，请确保设置以下环境变量：

### 必需变量
- `DATABASE_URL`: PostgreSQL 数据库连接字符串
- `JWT_SECRET`: JWT 签名密钥（至少64字符）
- `ADMIN_USERNAME`: 管理员用户名
- `ADMIN_PASSWORD`: 管理员密码（请使用强密码）

### 可选变量
- `ENABLE_SMART_FALLBACK`: 启用智能备用模式（默认：true）
- `PUBLIC_API_BASE`: API 基础URL（生产环境请设置为实际域名）
- `PUBLIC_SECURE_COOKIES`: 安全Cookie设置（生产环境设为true）
- `PUBLIC_DEV_NOAUTH`: 开发模式（生产环境设为false）
- `DISABLE_DATABASE`: 禁用数据库（测试时使用）

## 部署步骤

1. **设置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，填入实际的值
   ```

2. **生成JWT密钥**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

3. **安装依赖**
   ```bash
   npm install
   ```

4. **设置数据库**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

5. **构建项目**
   ```bash
   npm run build
   ```

6. **启动服务**
   ```bash
   npm run preview
   ```

## 安全提醒

⚠️ **重要**: 
- 不要在代码中硬编码密码或密钥
- 使用强密码作为管理员密码
- 在生产环境中设置 `PUBLIC_SECURE_COOKIES=true`
- 定期轮换JWT密钥
- 确保数据库连接使用SSL

## 常见问题

### 构建失败
- 检查是否设置了所有必需的环境变量
- 确保数据库连接正常
- 检查依赖是否正确安装

### 登录失败
- 确保设置了 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`
- 检查JWT_SECRET是否正确设置
- 验证环境变量是否正确加载

### 数据库连接失败
- 检查 `DATABASE_URL` 格式是否正确
- 确保数据库服务器可访问
- 验证数据库凭据是否正确
