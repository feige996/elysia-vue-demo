# vue3-bun-elysia-demo

一个开箱即用的全栈模板，技术栈为 `Vue3 + Elysia + Bun + AlovaJS`，采用前后端分离目录：

- `web`：前端项目（Vue3 + Vite + TypeScript + AlovaJS + Zod）
- `api`：后端项目（Elysia + Bun + TypeScript + elysia-di + Zod）

## 环境要求

- Bun >= 1.3

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

## 数据库模式（同时支持 PostgreSQL / MySQL）

后端支持三种运行模式：

- `memory`：默认模式，无需数据库
- `postgres`：连接 PostgreSQL
- `mysql`：连接 MySQL

使用方式（在启动前设置环境变量）：

```bash
DB_CLIENT=postgres DATABASE_URL=postgres://user:password@localhost:5432/demo bun run --cwd api dev
DB_CLIENT=mysql DATABASE_URL=mysql://user:password@localhost:3306/demo bun run --cwd api dev
```

说明：

- 未设置 `DB_CLIENT` 时默认使用 `memory`
- 当 `DB_CLIENT` 为 `postgres` 或 `mysql` 时必须提供 `DATABASE_URL`
- SQL 模式启动时会自动创建 `users` 和 `articles` 表并填充基础种子数据

## 日志模式

后端日志统一使用 `pino`，支持 `LOG_LEVEL`。

使用方式：

```bash
bun run --cwd api dev
# 或者指定日志级别，不写默认 `info`
LOG_LEVEL=debug bun run --cwd api dev
```

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
