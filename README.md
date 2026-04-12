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
```

说明：

- `dev`：并行启动前后端开发服务
- `build`：构建前后端产物
- `start`：启动后端生产构建
- `typecheck`：执行前后端类型检查

## 示例账号

- account: `admin`
- password: `admin123`

## 项目结构

```text
.
├── api
│   ├── src
│   │   ├── index.ts
│   │   ├── middleware
│   │   ├── modules
│   │   ├── repositories
│   │   └── services
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
