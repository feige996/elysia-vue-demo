# vue3-bun-elysia-demo

一个开箱即用的全栈模板，技术栈为 `Vue3 + Elysia + Bun + AlovaJS`，采用前后端分离目录：

- `web`：前端项目（Vue3 + Vite + TypeScript + AlovaJS + Zod）
- `api`：后端项目（Elysia + Bun + TypeScript + elysia-di + Zod）

## 环境要求

- Bun >= 1.3

后端环境变量文件：

- `api/.env`：本地默认环境
- `api/.env.example`：环境变量示例模板

## 快速开始

在项目根目录执行：

```bash
bun install
bun run dev
```

启动后默认地址：

- 前端：`http://localhost:5173`（若端口被占用会自动递增）
- 后端：`http://localhost:3000`

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

- `dev`：并行启动前后端开发服务
- `build`：构建前后端产物
- `start`：启动后端生产构建
- `typecheck`：执行前后端类型检查
- `test`：执行后端 unit + integration 测试

## 数据库模式（仅支持 PostgreSQL）

使用方式（在启动前设置环境变量）：

```bash
DATABASE_URL=postgres://user:password@localhost:5432/demo bun run --cwd api dev
```

说明：

- 必须提供 `DATABASE_URL`
- 后端端口使用 `API_PORT`（默认 `3000`）
- 前端端口使用 `WEB_PORT`（默认 `5173`）
- 数据库访问使用 Drizzle ORM
- 结构迁移使用 Drizzle Kit（配置文件：`api/drizzle.config.js`）
- 首次运行前请先执行迁移命令
- 服务启动会执行数据库健康检查：`production` 失败即退出，非生产环境会记录告警并继续启动

常用数据库脚本：

```bash
bun run --cwd api db:generate
bun run --cwd api db:migrate
bun run --cwd api db:push
bun run --cwd api db:studio
```

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
- `DATABASE_URL`：PostgreSQL 连接串

## 示例账号

- account: `admin`
- password: `admin123`

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
├── web
│   ├── src
│   │   ├── api
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

- `POST /api/auth/login`：登录
- `GET /api/users`：用户列表（需 `Authorization: Bearer demo-token`）
- `GET /api/articles`：文章列表
