# Harbor

Harbor 是一个面向中后台场景的全栈 Monorepo 工程基座（Vue 3 + Elysia + Bun + Eden），用于在统一规范下快速孵化业务系统。  
相较于只提供页面骨架的模板，它内置了可直接复用的 RBAC、审计日志、统一错误处理、就绪检查、分级限流、E2E/CI 质量门禁与 CRUD 页面基建，能够显著降低从 0 到 1 的搭建成本，并减少多人协作时的实现分歧与回归风险。

## 目录

- [项目包含](#项目包含)
- [快速开始](#快速开始)
- [环境要求](#环境要求)
- [本地示例账号](#本地示例账号)
- [已完成功能（对外可展示）](#已完成功能对外可展示)
- [常用命令](#常用命令)
- [最小接口入口](#最小接口入口)
- [常见问题](#常见问题)
- [文档索引](#文档索引)
- [License](#license)

## 项目包含

- `api`：后端服务（认证、权限、数据接口、OpenAPI）
- `admin`：后台管理端（中后台运营与系统管理）
- `web`：前台站点（业务展示与前台交互）

## 快速开始

3 步跑起来：

在仓库根目录执行：

```bash
# 1) 安装依赖
bun install

# 2) 初始化数据库
bun run --cwd api db:migrate
bun run --cwd api db:seed

# 3) 启动开发环境
bun run dev
```

默认地址：

- API：`http://localhost:3000`
- Admin：`http://localhost:7000`
- Web：`http://localhost:8000`

## 环境要求

- Bun `1.3.11`
- PostgreSQL（必需）
- Redis（可选，建议开启）

建议先检查本地工具版本与服务状态：

```bash
bun -v
psql --version
redis-cli ping
```

## 本地示例账号

- `admin` / `admin123`
- `editor` / `editor123`

> 仅用于本地开发/演示环境。生产环境必须修改默认密码或禁用默认账号。

## 已完成功能（对外可展示）

- **开箱即用的后台基础设施**
  - JWT 登录/刷新/登出链路已打通，支持会话续期与退出撤销
  - RBAC 管理闭环可直接使用（用户、角色、菜单、权限、部门）
  - 管理员路由保护与前端权限指令（`v-permission`）已落地
- **面向生产的稳定性能力**
  - 统一业务错误码体系 + 前端错误映射，问题更易定位
  - `/ready` 就绪检查可观测数据库/Redis 状态，便于运维接入
  - 分级限流与 CORS 白名单策略内置，默认更安全
  - 审计日志完整记录并支持多维筛选，满足基础审计诉求
- **可复制的研发提效能力**
  - CRUD 基建组件已沉淀（`SearchBar`、`TableToolbar`、`FormDrawer`、`UnifiedState`、`DataTablePage`）
  - 用户/角色/字典/部门等核心页面已模板化，新增页面可快速复用
  - 系统保留角色保护策略已具备，降低误操作风险
  - 字典管理后台化已落地（字典类型/字典项 CRUD + 状态切换）
  - 用户管理支持按部门筛选与部门字段维护
- **可持续交付的质量体系**
  - 单元测试 + 集成测试 + Admin E2E Smoke 已接入
  - CI 质量门禁已覆盖 typecheck/lint/format/test/build
  - OpenAPI 自动生成与文档入口（`/openapi.json`、`/docs`）已可用

## 常用命令

日常开发：

```bash
bun run dev
```

提交前检查（与 CI 基本对齐）：

```bash
bun run dev:check
bun run test
bun run build
```

安全检查：

```bash
bun run audit
```

API 测试（补充）：

- `api` 的测试命令已内置 `--preload ./tests/setup-env.ts`，会在测试启动前自动读取 `api/.env`。
- 若在命令行/CI 显式传入环境变量（如 `JWT_SECRET`），将优先于 `api/.env`，不会被覆盖。

```bash
# API 单元测试
bun run --cwd api test:unit

# API 集成测试（含 dict 集成用例）
bun run --cwd api test:integration
```

## 最小接口入口

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /ready`
- `GET /api/users`
- `GET /api/roles`
- `GET /api/dict-types`
- `GET /api/depts/tree`

完整接口文档：

- OpenAPI JSON：`/openapi.json`
- Swagger UI：`/docs`

> 可选模块开关（含 `monitor` 示例）的本地验证方式见 `doc/1.13-可选模块开关与最小落地方案.md`。

## 常见问题

### 1) 启动时报数据库连接失败

- 确认 PostgreSQL 已启动且账号密码可用。
- 先执行 `bun run --cwd api db:migrate`，再启动 `bun run dev`。

### 2) Redis 没启动会怎样？

- 系统可在部分场景下降级运行，但建议开启 Redis 以保证缓存与相关能力完整。
- 可先用 `redis-cli ping` 验证连通性。

### 3) API 测试读取的是哪个环境变量？

- 默认读取 `api/.env`（由测试 preload 自动加载）。
- CI 或命令行显式传入的环境变量优先级更高。

### 4) 端口冲突怎么处理？

- 默认端口：API `3000`、Admin `7000`、Web `8000`。
- 若冲突，请按各子项目配置修改端口后重启。

## 文档索引

详细内容请看：

- 文档总览：`doc/README.md`
- 对外介绍：`doc/1.00-基座价值与适用场景.md`
- 已完成功能：`doc/1.01-已完成功能清单.md`
- 快速体验：`doc/1.02-快速上手与演示路径.md`
- 内部治理：`doc/1.10-当前状态与验收口径.md`
- 协作说明：`CONTRIBUTING.md`

## License

[MIT](./LICENSE)
