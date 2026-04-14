# Harbor

Harbor 是一个面向中后台场景的全栈 Monorepo 工程基座（Vue 3 + Elysia + Bun + Eden），用于在统一规范下快速孵化业务系统。  
相较于只提供页面骨架的模板，它内置了可直接复用的 RBAC、审计日志、统一错误处理、就绪检查、分级限流、E2E/CI 质量门禁与 CRUD 页面基建，能够显著降低从 0 到 1 的搭建成本，并减少多人协作时的实现分歧与回归风险。

## 1. 已完成功能（对外可展示）

- **开箱即用的后台基础设施**
  - JWT 登录/刷新/登出链路已打通，支持会话续期与退出撤销
  - RBAC 管理闭环可直接使用（用户、角色、菜单、权限）
  - 管理员路由保护与前端权限指令（`v-permission`）已落地
- **面向生产的稳定性能力**
  - 统一业务错误码体系 + 前端错误映射，问题更易定位
  - `/ready` 就绪检查可观测数据库/Redis 状态，便于运维接入
  - 分级限流与 CORS 白名单策略内置，默认更安全
  - 审计日志完整记录并支持多维筛选，满足基础审计诉求
- **可复制的研发提效能力**
  - CRUD 基建组件已沉淀（`SearchBar`、`TableToolbar`、`FormDrawer`、`UnifiedState`、`DataTablePage`）
  - 用户/角色等核心页面已模板化，新增页面可快速复用
  - 系统保留角色保护策略已具备，降低误操作风险
- **可持续交付的质量体系**
  - 单元测试 + 集成测试 + Admin E2E Smoke 已接入
  - CI 质量门禁已覆盖 typecheck/lint/format/test/build
  - OpenAPI 自动生成与文档入口（`/openapi.json`、`/docs`）已可用

## 2. 项目包含

- `api`：后端服务
- `admin`：后台管理端
- `web`：前台站点

## 3. 环境要求

- Bun `1.3.11`
- PostgreSQL（必需）
- Redis（可选，建议开启）

## 4. 本地启动（推荐顺序）

在仓库根目录执行：

```bash
bun install
bun run --cwd api db:migrate
bun run --cwd api db:seed
bun run dev
```

默认地址：

- API：`http://localhost:9000`
- Admin：`http://localhost:7000`
- Web：`http://localhost:8000`

## 5. 本地示例账号

- `admin` / `admin123`
- `editor` / `editor123`

> 仅用于本地开发/演示环境。生产环境必须修改默认密码或禁用默认账号。

## 6. 常用命令

```bash
# 开发
bun run dev

# 与 CI 基本对齐的检查
bun run dev:check
bun run test
bun run build

# 依赖安全检查
bun run audit
```

## 7. 最小接口入口

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /ready`
- `GET /api/users`
- `GET /api/roles`

完整接口文档：

- OpenAPI JSON: `/openapi.json`
- Swagger UI: `/docs`

## 8. 文档索引

详细内容请看：

- 验收与路线：`doc/基座1.0验收与1.1路线.md`
- 执行清单：`doc/下一阶段执行清单.md`
- 依赖风险台账：`doc/依赖风险台账.md`
- 协作说明：`CONTRIBUTING.md`

## License

[MIT](./LICENSE)
