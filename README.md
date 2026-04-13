# vue3-bun-elysia-demo

一个开箱即用的全栈模板，技术栈为 `Vue3 + Elysia + Bun + Eden`，采用三端分离目录：

- `api`：后端项目（Elysia + Bun + TypeScript + elysia-di + Zod）
- `admin`：后台项目（Vue3 + Vite + TypeScript + Eden + Naive UI + Zod）
- `web`：前端项目（Vue3 + Vite + TypeScript + Eden + Zod）

## 环境要求

- Bun >= 1.3

环境变量文件：

- `api/.env`：本地默认环境
- `api/.env.example`：环境变量示例模板
- `admin/.env.example`：后台环境变量示例模板
- `web/.env.example`：前台环境变量示例模板

## 快速开始

在项目根目录执行：

```bash
bun install
bun run dev
```

启动后默认地址：

- 后端：`http://localhost:9000`
- 后台：`http://localhost:7000`（若端口被占用会自动递增）
- 前台：`http://localhost:8000`（若端口被占用会自动递增）

## 常用脚本

根目录脚本：

```bash
bun run dev
bun run build
bun run start
bun run typecheck
bun run test
```

说明：

- `dev`：并行启动 api + admin + web 开发服务
- `build`：构建三端产物
- `start`：启动后端生产构建
- `typecheck`：执行三端类型检查
- `test`：执行后端 unit + integration 测试

## 数据库模式（仅支持 PostgreSQL）

使用方式（在启动前设置环境变量）：

```bash
PG_HOST=localhost PG_PORT=5432 PG_USER=postgres PG_PASSWORD=postgres PG_DATABASE=elysia_demo bun run --cwd api dev
```

说明：

- 必须提供完整的 `PG_HOST/PG_PORT/PG_USER/PG_PASSWORD/PG_DATABASE`（兼容 `DATABASE_URL` 旧配置）
- 后端端口使用 `API_PORT`（默认 `9000`）
- 后台端口使用 `ADMIN_PORT`（默认 `7000`）
- 前台端口使用 `WEB_PORT`（默认 `8000`）
- 数据库访问使用 Drizzle ORM
- 结构迁移使用 Drizzle Kit（配置文件：`api/drizzle.config.js`）
- 首次运行前请先执行迁移命令
- 服务启动会执行数据库健康检查：`production` 失败即退出，非生产环境会记录告警并继续启动
- 开发环境可使用 `db:push` 快速同步结构，生产环境建议只使用 `db:generate + db:migrate`

常用数据库脚本：

```bash
bun run --cwd api db:generate
bun run --cwd api db:migrate
bun run --cwd api db:push
bun run --cwd api db:studio
```

接口文档：

- OpenAPI JSON：`/openapi.json`
- Swagger UI：`/docs`
- 基于 Zod 自动生成 OpenAPI 文件：`bun run --cwd api openapi:generate`（输出 `api/openapi.generated.json`）

模块脚手架：

```bash
bun run --cwd api module:create demo
```

推荐本地启动顺序：

```bash
# 1) 健康检查
bun run --cwd api db:check
# 2) 首次写入种子数据
bun run --cwd api db:seed
# 3) 启动后端开发服务
bun run --cwd api dev
```

## 日志模式

后端日志统一使用 `pino`，支持 `LOG_LEVEL` 与按天落盘配置。

默认行为：

- 本地开发（`NODE_ENV` 非 `production`）：输出到控制台
- 生产环境（`NODE_ENV=production`）：默认落盘到按天文件（例如 `logs/app-2026-04-12.log`）

使用方式：

```bash
bun run --cwd api dev
# 或者指定日志级别，不写默认 `info`
LOG_LEVEL=debug bun run --cwd api dev
# 生产环境默认按天写文件
NODE_ENV=production bun run --cwd api start
# 显式指定按天模板（推荐）
NODE_ENV=production LOG_FILE_PATH=/var/log/elysia/app-{date}.log bun run --cwd api start
```

核心变量：

- `NODE_ENV`：`development | test | production`
- `LOG_LEVEL`：`trace | debug | info | warn | error | fatal`
- `LOG_FILE_PATH`：日志文件路径模板，支持 `{date}` 占位符
- `LOG_FILE_DIR`：未设置 `LOG_FILE_PATH` 时的日志目录（默认 `logs`）
- `LOG_FILE_PREFIX`：未设置 `LOG_FILE_PATH` 时的日志文件前缀（默认 `app`）
- `PG_HOST/PG_PORT/PG_USER/PG_PASSWORD/PG_DATABASE`：PostgreSQL 拆分配置（推荐）
- `DATABASE_URL`：PostgreSQL 连接串（兼容旧配置，可选）
- `JWT_SECRET`：JWT 签名密钥（必填）
- `JWT_EXPIRES_IN`：access token 过期时间（示例：`1h`）
- `JWT_EXPIRES_IN_SECONDS`：access token 过期秒数（可选）
- `JWT_REFRESH_EXPIRES_IN_SECONDS`：refresh token 过期秒数（默认 `604800`）
- `REDIS_URL`：refresh token 撤销状态存储地址（可选）
- `REDIS_HOST/REDIS_PORT`：Redis 拆分配置（推荐）
- `VITE_API_BASE_URL`：web/admin 访问 API 的基础地址

前端请求分层约定：

- `web/src/api/request.ts`、`admin/src/api/request.ts`：统一请求内核（token、refresh、错误归一化）
- `web/src/api/modules/*`、`admin/src/api/modules/*`：业务接口方法
- 页面层只消费 modules，不直接编写请求细节

## 示例账号

- account: `admin`
- password: `admin123`
- account: `editor`
- password: `editor123`

## 项目结构

```text
.
├── api
│   ├── src
│   │   ├── app
│   │   │   ├── index.ts
│   │   │   ├── middleware
│   │   │   └── plugins
│   │   ├── infra
│   │   │   └── db
│   │   ├── modules
│   │   │   ├── user
│   │   │   └── article
│   │   ├── shared
│   │   │   ├── auth
│   │   │   ├── logger
│   │   │   └── types
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── admin
│   ├── src
│   │   ├── api
│   │   │   ├── request.ts
│   │   │   └── modules
│   │   ├── views
│   │   ├── style
│   │   ├── App.vue
│   │   └── main.ts
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── web
│   ├── src
│   │   ├── api
│   │   │   ├── request.ts
│   │   │   └── modules
│   │   ├── views
│   │   ├── style
│   │   ├── App.vue
│   │   └── main.ts
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── package.json
```

## 接口示例

- `POST /api/auth/login`：登录（返回 accessToken + refreshToken）
- `POST /api/auth/refresh`：刷新 access token（refresh token 轮转）
- `POST /api/auth/logout`：撤销 refresh token
- `GET /api/users`：用户分页列表（需携带 JWT 且角色为 admin）
- `GET /api/users/all`：用户全量列表（需携带 JWT 且角色为 admin）
- `POST /api/users`：新增用户（需鉴权）
- `PUT /api/users/:id`：更新用户（需鉴权）
- `DELETE /api/users/:id`：删除单个用户（需鉴权）
- `DELETE /api/users`：批量删除用户（需鉴权）
- `GET /api/articles`：文章分页列表
- `GET /api/articles/all`：文章全量列表
- `POST /api/articles`：新增文章（需鉴权）
- `PUT /api/articles/:id`：更新文章（需鉴权）
- `DELETE /api/articles/:id`：删除单个文章（需鉴权）
- `DELETE /api/articles`：批量删除文章（需鉴权）
- `POST /api/file/upload`：上传文件（依赖存储配置）
- `DELETE /api/file`：删除文件（依赖存储配置）
- `GET /api/file/url`：获取文件访问地址（依赖存储配置）
- 角色策略：`admin` 可访问所有受保护接口；`editor` 仅可访问非管理员接口

JWT 启用示例：

```bash
JWT_SECRET=replace-me-with-strong-secret JWT_REFRESH_EXPIRES_IN_SECONDS=604800 REDIS_URL=redis://localhost:6379 bun run --cwd api dev
```

## Docker 部署

根目录一键启动：

```bash
docker compose up -d --build
```

容器默认端口：

- api: `9000`
- admin: `7000`
- web: `8000`

首次启动后执行：

```bash
docker compose exec api bun run db:migrate
docker compose exec api bun run db:seed
```
