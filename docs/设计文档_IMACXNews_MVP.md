## IMACXNews 系统设计与MVP实施方案

- 文档路径: `docs/设计文档_IMACXNews_MVP.md`
- 版本: v0.3
- 最近更新: 2025-08-31

---

### 目录
- 概述
- 当前架构
- 目标与范围
- MVP 功能清单与进度
- 数据模型
- API 设计
- 鉴权与权限
- 前端改造点
- 部署与配置
- 发布分阶段规划
- 里程碑与验收标准
- 风险与缓解
- 代码示例
- 附录

---

### 概述
IMACXNews 现为 Astro 静态站，文章数据打包在前端并用 `localStorage` 做临时编辑。目标是在保留 Astro 的前端体验基础上，引入用户系统、评论与点赞、管理员文章与封面管理，并支持后续自动化（AI 改写与自动封面）。

---

### 当前架构
- 技术栈: Astro 静态构建；无 SSR 适配器。
- 数据源:
  - `src/data/articles.js`（构建时快照 + 运行时 localStorage 覆盖首页）
  - `src/data/categories.js`
- 路由:
  - 首页 `src/pages/index.astro`：构建期渲染，前端脚本用 localStorage 覆盖列表。
  - 文章页 `src/pages/article/[slug].astro`：静态预渲染（构建时快照）。
  - 分类页 `src/pages/category/[category].astro`：静态预渲染（构建时快照）。
- 管理与登录:
  - `LoginModal.astro`：本地固定账号（Admin/1234），无后端鉴权。
  - `AdminArticleManager.astro`：操作 `localStorage`，非持久、非跨设备。
- 已知问题:
  - `Layout.astro` 引用的 `CreateNewsModal.astro`、`EditNewsModal.astro` 不存在。
  - 所有编辑不会更新已预渲染的文章/分类页。

---

### 目标与范围
- 普通用户: 注册/登录、评论、点赞。
- 管理员: 文章增删改、替换封面（URL 先行，文件直传后续）、修改发布日期（publishDate）、可触发自动化。
- 架构改造: 增加 API + 数据库；文章页从“构建期快照”走向“请求期数据”。
- 非目标（MVP之外）: 富文本编辑器、草稿/发布流、复杂媒体处理、搜索、国际化切换等。

---

### MVP 功能清单与进度
- 必做清理
  - [x] 移除 `src/layouts/Layout.astro` 中 `CreateNewsModal.astro`、`EditNewsModal.astro` 的 import 与使用
  - [ ] 运行校验：`npm run dev` 与 `npm run build` 不再报缺失组件错误
  - [x] 文档同步：在本文件“前端改造点”保留该清理项，记录已完成状态

- A 管理端闭环
  - [x] A1 鉴权最小闭环（登录 + 会话）
    - 新增 `src/lib/auth.ts`：`setAuthCookie`、`getUserFromRequest`、`requireRole`
    - 新增登录接口 `src/pages/api/auth/login.ts`：校验用户、签发 JWT，设置 HttpOnly Cookie
    - 环境变量与种子：`.env` 增加 `JWT_SECRET`；提供种子脚本创建 admin 账号（bcrypt）
    - 前端改造：`LoginModal.astro` 提交流程改为 `fetch('/api/auth/login')`，成功后刷新；未授权处理 401 提示
    - 验收：登录后刷新仍保持；未登录/非 admin 写操作返回 401/403
  - [ ] A2 文章 CRUD API（含发布日期）
    - 数据层：按“数据模型”落库，执行 `npx prisma migrate dev`
    - 接口：
      - `GET /api/articles`（支持 `?slug=`）；`POST /api/articles`
      - `GET /api/articles/[id]`、`PATCH /api/articles/[id]`、`DELETE /api/articles/[id]`
    - 规则：`title` 变更自动更新 `slug`；`publishDate` 支持 ISO 8601，未传则用当前时间；参数非法返回 422
    - 验收：列表/详情/创建/更新/删除可用；含 `publishDate` 写入/更新正确
  - [ ] A3 管理 UI 对接 API（含发布日期编辑）
    - 列表：`AdminArticleManager.astro` 使用 `GET /api/articles` 渲染
    - 删除：改为 `DELETE /api/articles/[id]`，成功后刷新列表与页面
    - 新增/编辑：改为 `POST`/`PATCH`；表单字段包含 `title/excerpt/content/chineseContent/category/image(author URL)/author/featured/publishDate`
    - 发布日期：新增日期时间输入，前端做简单校验，后端最终校验并归一化（UTC）
    - 权限：仅 admin 可见与可操作；未登录提示登录
    - 验收：面板可增删改；封面 URL 与 `publishDate` 可保存；刷新后数据仍在
  - [ ] A4 首页数据用 API 覆盖
    - 策略：保留构建期首屏；在 `DOMContentLoaded` 后 `GET /api/articles` 覆盖“Latest/All”两处渲染
    - 排序：按 `publishDate` 降序；无数据时显示空态提示
    - 回退：请求失败时保留构建期快照并提示错误（console）
    - 验收：新增或编辑文章后，无需重建，刷新首页即可看到最新内容

- B 社交（普通用户）
  - [ ] B1 点赞：`/api/articles/[id]/likes` + `LikeButton.astro`
  - [ ] B2 评论：`/api/articles/[id]/comments` + `Comments.astro`

- C 动态化文章页
  - [ ] C1 快速方案：前端加载后请求 `/api/articles?slug=...` 替换文章 DOM
  - [ ] C2 正式方案：启用 SSR 适配器，`[slug].astro` / `[category].astro` 改 `prerender = false`，服务端取数

- D 封面上传（后续）
  - [ ] D1 上传签名接口 `/api/upload/sign`（对接对象存储）
  - [ ] D2 前端直传 + 回写文章 `image`

---

### 数据模型（Prisma 草案）
```prisma
datasource db { provider = "sqlite"; url = env("DATABASE_URL") }
generator client { provider = "prisma-client-js" }

enum Role { USER ADMIN }

model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  comments  Comment[]
  likes     ArticleLike[]
}

model Article {
  id             Int           @id @default(autoincrement())
  title          String
  slug           String        @unique
  excerpt        String
  content        String
  chineseContent String?
  category       String
  image          String
  author         String
  publishDate    DateTime      @default(now())
  featured       Boolean       @default(false)
  comments       Comment[]
  likes          ArticleLike[]
}

model Comment {
  id        Int      @id @default(autoincrement())
  article   Article  @relation(fields: [articleId], references: [id])
  articleId Int
  user      User     @relation(fields: [userId], references: [id])
  userId    Int
  body      String
  createdAt DateTime @default(now())
}

model ArticleLike {
  id        Int      @id @default(autoincrement())
  article   Article  @relation(fields: [articleId], references: [id])
  articleId Int
  user      User     @relation(fields: [userId], references: [id])
  userId    Int

  @@unique([articleId, userId])
}
```

---

### API 设计（最小集合）
- 鉴权
  - POST `/api/auth/login`
    - req: `{ username, password }`
    - res: `{ id, username, role }`，同时设置 `token` HttpOnly Cookie
- 文章
  - GET `/api/articles`（可支持 `?slug=`）
  - POST `/api/articles`（admin）：`{ title, excerpt, content, chineseContent?, category, image, author, featured?, publishDate? }`
    - 说明：`publishDate` 可选，ISO 8601（如 `2025-01-15T13:00:00Z`）；不传则由服务端设为当前时间
  - GET `/api/articles/[id]`
  - PATCH `/api/articles/[id]`（admin）：同上字段，`title` 会更新 `slug`，允许更新 `publishDate`（ISO 8601 校验）
  - DELETE `/api/articles/[id]`（admin）
- 点赞
  - GET `/api/articles/[id]/likes` → `{ count }`
  - POST `/api/articles/[id]/likes`（login）→ `{ liked: boolean }`（切换）
- 评论
  - GET `/api/articles/[id]/comments`
  - POST `/api/articles/[id]/comments`（login）：`{ body }`
  - DELETE `/api/articles/[id]/comments`（login/admin）：`{ commentId }`
- 上传（预留）
  - POST `/api/upload/sign`（admin）→ `{ uploadUrl, publicUrl }`

响应约定：
- 401: 未登录；403: 权限不足；404: 资源不存在；422: 参数校验失败；500: 未预期错误。

---

### 鉴权与权限
- 鉴权: JWT（`HttpOnly` + `SameSite=Lax` + `Secure`），后端校验。
- 角色:
  - USER: 登录、评论、点赞、删除自己的评论
  - ADMIN: 文章增删改、封面替换、修改发布日期、删除任意评论
- 前端：
  - `LoginModal.astro` 改为调 `/api/auth/login`，成功后刷新 UI。

---

### 前端改造点
- `src/layouts/Layout.astro`
  - 移除无效组件 import：`CreateNewsModal.astro`、`EditNewsModal.astro`
- `src/components/global/LoginModal.astro`
  - 提交时改为 `fetch('/api/auth/login')`
- `src/components/global/AdminArticleManager.astro`
  - `loadArticlesList()` 改为 GET `/api/articles`
  - 删除函数改为调用 DELETE `/api/articles/[id]`
  - 新增与编辑改为 POST/PATCH
  - 封面字段先用 URL 文本框
  - 新增“发布日期（publishDate）”输入（日期时间），提交时带入；前端做基本格式校验，服务端做最终校验与归一化（UTC）
- `src/pages/index.astro`
  - DOMContentLoaded 后用 GET `/api/articles` 覆盖“最新/全部”列表
- `src/pages/article/[slug].astro`
  - C1：加载后请求 `/api/articles?slug=...` 替换 DOM，或
  - C2：`export const prerender = false;` 服务端 fetch

---

### 部署与配置
- 适配器：`@astrojs/node`（本地/自托管）或 Vercel/Netlify（可选）
- 环境变量：
  - `DATABASE_URL="file:./dev.db"`（生产建议 Postgres）
  - `JWT_SECRET="强随机值"`
  - `PUBLIC_API_BASE`（部署后前缀）
- 初始化：
  - `npx prisma init` → `prisma/schema.prisma`
  - `npx prisma migrate dev --name init`
  - 种子数据：创建 admin 用户（`bcrypt.hash`）

---

### 发布分阶段规划
- 一、预发布/内测（Staging/Beta）
  - 文章与分类页切换为服务端取数：采用 C2（`prerender = false` + 适配器）。
  - 数据库切换为托管 Postgres（Supabase/RDS），建立迁移与种子流程。
  - 封面文件上传改为对象存储直传（签名接口 + CDN 公网读）。
  - 登录策略：强口令、bcrypt、Token 有效期与刷新、最小权限。
  - CI/CD：PR 构建、预览环境；E2E 验收用例（登录、发文、编辑、评论、点赞）。

- 二、生产 v1（可对外）
  - 可观测性：日志、错误上报（Sentry）、健康检查。
  - 备份与回滚：定时备份 DB/Storage，灰度发布与快速回滚。
  - 安全与合规：CORS、CSRF、内容安全策略（CSP）、速率限制、WAF/防火墙。
  - 性能与缓存：CDN 缓存（首页、列表）、图片优化、站点地图与基础 SEO）。
  - 审计：管理员操作留痕（谁在何时改了什么）。

- 三、生产 v1.1（加固）
  - 测试覆盖扩展：集成 + E2E；负载与压测。
  - 列表分页/游标、简单搜索（关键词）。
  - 评论治理：敏感词过滤、举报/隐藏流。
  - 账号体系：邮箱验证、找回密码、会话管理（踢下线）。
  - RBAC 细化：编辑、发布、管理员等粒度区分。

- 四、生产 v2（扩展/规模化）
  - AI 自动化：定时改写与自动封面（Cron），引入人工审核流程。
  - 工作流：草稿-审阅-发布；版本历史与回滚。
  - 多语言/i18n：不止双字段渲染，加入语言切换与路由。
  - 指标与增长：埋点分析、A/B 测试、推荐位策略。

- 五、运维与成本优化（持续）
  - 监控看板：延迟、错误率、吞吐量。
  - 成本观测：数据库与存储费用预警，缓存命中率优化。

---

### 里程碑与验收标准
- M0 清理（5 分钟）
  - [ ] 构建/运行不再因缺失组件报错
- M1 A1 鉴权
  - [ ] admin 能登录，刷新后仍保持登录态
  - [ ] 未登录用户写操作均拒绝（401/403）
- M2 A2 文章 API
  - [ ] 列表/详情/创建/更新/删除均可用；slug 自动生成；支持创建/更新 `publishDate` 并通过 ISO 8601 校验
- M3 A3 管理 UI
  - [ ] 面板内可增删改；封面 URL 替换；可编辑并保存 `publishDate`；刷新后数据仍在
- M4 A4 首页
  - [ ] 首页可看到新增/修改文章（无需重建）
- M5 B1 点赞
  - [ ] 登录用户可点赞/取消，计数实时更新与持久
- M6 B2 评论
  - [ ] 登录用户可发/删自己的评论；admin 可删任意评论
- M7 C1/C2 文章页动态化
  - [ ] 打开文章页即为最新内容（C1：加载后替换；C2：直出最新）

---

### 代码示例

```ts
// src/lib/auth.ts
import jwt from 'jsonwebtoken';

export function setAuthCookie(headers: Headers, token: string) {
  headers.append('Set-Cookie', `token=${token}; Path=/; HttpOnly; SameSite=Lax; Secure`);
}

export function getUserFromRequest(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/(?:^|;\s*)token=([^;]+)/);
  if (!match) return null;
  try {
    return jwt.verify(decodeURIComponent(match[1]), import.meta.env.JWT_SECRET) as { id:number; role:'USER'|'ADMIN'; username:string };
  } catch { return null; }
}

export function requireRole(user: any, roles: Array<'USER'|'ADMIN'>) {
  if (!user || !roles.includes(user.role)) {
    const e = new Error('Forbidden');
    // @ts-ignore
    e.status = 403;
    throw e;
  }
}
```

```ts
// src/pages/api/auth/login.ts
import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { setAuthCookie } from '../../../lib/auth';

const prisma = new PrismaClient();

export const POST: APIRoute = async ({ request }) => {
  const { username, password } = await request.json();
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return new Response('Unauthorized', { status: 401 });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return new Response('Unauthorized', { status: 401 });

  const token = jwt.sign({ id: user.id, role: user.role, username }, import.meta.env.JWT_SECRET, { expiresIn: '7d' });
  const headers = new Headers();
  setAuthCookie(headers, token);
  return new Response(JSON.stringify({ id: user.id, username, role: user.role }), { status: 200, headers });
};
```

```ts
// src/pages/api/articles/index.ts
import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest, requireRole } from '../../../lib/auth';

const prisma = new PrismaClient();

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  if (slug) {
    const one = await prisma.article.findUnique({ where: { slug } });
    return one ? new Response(JSON.stringify([one])) : new Response(JSON.stringify([]));
  }
  const articles = await prisma.article.findMany({ orderBy: { publishDate: 'desc' } });
  return new Response(JSON.stringify(articles));
};

export const POST: APIRoute = async ({ request }) => {
  const user = getUserFromRequest(request);
  requireRole(user, ['ADMIN']);
  const data = await request.json();
  const slug = data.title.toLowerCase().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').trim();
  const created = await prisma.article.create({
    data: { ...data, slug, publishDate: data.publishDate ? new Date(data.publishDate) : new Date() }
  });
  return new Response(JSON.stringify(created), { status: 201 });
};
```

```ts
// src/pages/api/articles/[id].ts
import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest, requireRole } from '../../../lib/auth';

const prisma = new PrismaClient();

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  const a = await prisma.article.findUnique({ where: { id } });
  return a ? new Response(JSON.stringify(a)) : new Response('Not Found', { status: 404 });
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const user = getUserFromRequest(request);
  requireRole(user, ['ADMIN']);
  const id = Number(params.id);
  const data = await request.json();

  if (data.title) {
    data.slug = data.title.toLowerCase().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').trim();
  }
  if (data.publishDate) {
    const d = new Date(data.publishDate);
    if (Number.isNaN(d.getTime())) return new Response('Invalid publishDate', { status: 422 });
    data.publishDate = d;
  }

  const upd = await prisma.article.update({ where: { id }, data });
  return new Response(JSON.stringify(upd));
};

export const DELETE: APIRoute = async ({ params, request }) => {
  const user = getUserFromRequest(request);
  requireRole(user, ['ADMIN']);
  const id = Number(params.id);
  await prisma.article.delete({ where: { id } });
  return new Response(null, { status: 204 });
};
```

```ts
// src/pages/api/articles/[id]/comments.ts
import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest, requireRole } from '../../../../lib/auth';

const prisma = new PrismaClient();

export const GET: APIRoute = async ({ params }) => {
  const articleId = Number(params.id);
  const list = await prisma.comment.findMany({
    where: { articleId },
    include: { user: { select: { id:true, username:true } } },
    orderBy: { createdAt: 'desc' }
  });
  return new Response(JSON.stringify(list));
};

export const POST: APIRoute = async ({ params, request }) => {
  const user = getUserFromRequest(request);
  requireRole(user, ['USER','ADMIN']);
  const articleId = Number(params.id);
  const { body } = await request.json();
  const created = await prisma.comment.create({ data: { articleId, userId: user!.id, body } });
  return new Response(JSON.stringify(created), { status: 201 });
};

export const DELETE: APIRoute = async ({ params, request }) => {
  const user = getUserFromRequest(request);
  requireRole(user, ['USER','ADMIN']);
  const articleId = Number(params.id);
  const { commentId } = await request.json();
  const c = await prisma.comment.findUnique({ where: { id: Number(commentId) } });
  if (!c || c.articleId !== articleId) return new Response('Not Found', { status: 404 });
  if (user!.role !== 'ADMIN' && c.userId !== user!.id) return new Response('Forbidden', { status: 403 });
  await prisma.comment.delete({ where: { id: c.id } });
  return new Response(null, { status: 204 });
};
```

```ts
// src/pages/api/articles/[id]/likes.ts
import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest, requireRole } from '../../../../lib/auth';

const prisma = new PrismaClient();

export const GET: APIRoute = async ({ params }) => {
  const articleId = Number(params.id);
  const count = await prisma.articleLike.count({ where: { articleId } });
  return new Response(JSON.stringify({ count }));
};

export const POST: APIRoute = async ({ params, request }) => {
  const user = getUserFromRequest(request);
  requireRole(user, ['USER','ADMIN']);
  const articleId = Number(params.id);
  const existing = await prisma.articleLike.findFirst({ where: { articleId, userId: user!.id } });
  if (existing) {
    await prisma.articleLike.delete({ where: { id: existing.id } });
    return new Response(JSON.stringify({ liked: false }));
  } else {
    await prisma.articleLike.create({ data: { articleId, userId: user!.id } });
    return new Response(JSON.stringify({ liked: true }));
  }
};
```

```ts
// src/pages/api/upload/sign.ts
import type { APIRoute } from 'astro';
import { getUserFromRequest, requireRole } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  const user = getUserFromRequest(request);
  requireRole(user, ['ADMIN']);
  return new Response(JSON.stringify({ uploadUrl: 'https://storage.example.com/signed-url', publicUrl: 'https://storage.example.com/public/xxx.jpg' }));
};
```

```astro
---
// src/pages/article/[slug].astro （动态示例）
export const prerender = false;
import ArticleLayout from '../../layouts/ArticleLayout.astro';

const { slug } = Astro.params;
const res = await fetch(`${import.meta.env.PUBLIC_API_BASE || ''}/api/articles?slug=${slug}`);
const list = await res.json();
const article = Array.isArray(list) ? list.find((a) => a.slug === slug) : null;
if (!article) { return Astro.redirect('/404'); }
---
<ArticleLayout article={article} />
```

```astro
---
// src/components/ui/LikeButton.astro
const { articleId } = Astro.props;
---
<button id={`like-${articleId}`}>Like</button>
<span id={`like-count-${articleId}`}>0</span>
<script>
  const id = Number({articleId});
  const btn = document.getElementById(`like-${id}`);
  const countEl = document.getElementById(`like-count-${id}`);
  async function refresh() {
    const r = await fetch(`/api/articles/${id}/likes`);
    const { count } = await r.json();
    countEl.textContent = String(count);
  }
  btn.addEventListener('click', async () => {
    const r = await fetch(`/api/articles/${id}/likes`, { method: 'POST' });
    if (r.ok) refresh();
    else alert('Please login first.');
  });
  refresh();
  </script>
```

```astro
---
// src/components/ui/Comments.astro
const { articleId } = Astro.props;
---
<div id={`comments-${articleId}`}></div>
<form id={`comment-form-${articleId}`}>
  <textarea name="body" required></textarea>
  <button type="submit">Post</button>
</form>
<script>
  const id = Number({articleId});
  const listEl = document.getElementById(`comments-${id}`);
  const form = document.getElementById(`comment-form-${id}`);
  async function load() {
    const r = await fetch(`/api/articles/${id}/comments`);
    const items = await r.json();
    listEl.innerHTML = items.map(c => `<div data-id="${c.id}"><b>${c.user.username}</b>: ${c.body}</div>`).join('');
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = new FormData(form).get('body');
    const r = await fetch(`/api/articles/${id}/comments`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ body }) });
    if (r.ok) { form.reset(); load(); } else alert('Please login first.');
  });
  load();
  </script>
```

```js
// LoginModal.astro 提交替换示例（片段）
const r = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type':'application/json'},
  body: JSON.stringify({ username, password })
});
if (r.ok) { location.reload(); } else { alert('用户名或密码错误'); }
```

```js
// astro.config.mjs （Node 适配器示例）
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  adapter: node({ mode: 'standalone' }),
  server: { port: 4321, host: true },
  devToolbar: { enabled: false }
});
```

```bash
# 依赖与初始化（命令）
npm i @astrojs/node prisma @prisma/client jsonwebtoken bcrypt zod
npx prisma init
npx prisma migrate dev --name init
```

---

### 下一步建议与连接排查指引（Supabase）
- 环境变量（建议使用 Pooled 连接，更稳定）：
  - 将密码做 URL 编码（Node 快速编码：`node -e 'console.log(encodeURIComponent("原始密码"))'`）
  - `.env` 示例（用 Supabase 控制台 Settings → Database → Connection string → Pooled 的主机替换 `POOL_HOST`）
```env
DATABASE_URL="postgresql://postgres:ENCODED_PASSWORD@POOL_HOST:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"
JWT_SECRET="replace-with-strong-secret"
PUBLIC_API_BASE=""
```
  - 如需直连（本地开发可用）：
```env
DATABASE_URL="postgresql://postgres:ENCODED_PASSWORD@db.ihkdquydhciabhrwffkb.supabase.co:5432/postgres?sslmode=require"
```

- 连接测试与迁移：
  - 网络连通测试：`nc -vz db.ihkdquydhciabhrwffkb.supabase.co 5432` 或 `nc -vz POOL_HOST 6543`
  - 生成并迁移：`npx prisma generate && npx prisma migrate dev --name init`
  - 若报 P1001：
    - 再次检查密码是否已 URL 编码、是否带有 `sslmode=require`
    - 尝试切换到 Pooled（6543 + `pgbouncer=true`）
    - 用 psql 验证：`psql "${DATABASE_URL}"`（能连上则 Prisma 侧配置/参数问题）

- 与本文档差异说明：
  - 代码仓库的 `prisma/schema.prisma` 使用 `provider = "postgresql"`（面向 Supabase）；文档中示例出现的 `sqlite` 仅用于早期本地开发参考。

- 短期任务清单（完成数据库连通后立即执行）：
  - 1) 运行 `npx prisma migrate dev --name init` 建表
  - 2) 在 `LoginModal.astro` 将表单提交替换为 `fetch('/api/auth/login')`
  - 3) 将 Admin 面板“New” 的 prompt 流程替换为表单（包含 `publishDate`）
  - 4) `src/pages/index.astro` 在 DOMContentLoaded 后调用 `/api/articles` 覆盖首页渲染
  - 5) 验收：新增/编辑/删除在首页、详情页可见（无需重建）

---

### 附录
- 命名约定：
  - slug 规则：小写英文数字与 `-`，空白折叠成单 `-`
- 代码位置（建议）：
  - `src/pages/api/auth/login.ts`
  - `src/pages/api/articles/index.ts`
  - `src/pages/api/articles/[id].ts`
  - `src/pages/api/articles/[id]/likes.ts`
  - `src/pages/api/articles/[id]/comments.ts`
  - `src/pages/api/upload/sign.ts`
  - `src/lib/auth.ts`


