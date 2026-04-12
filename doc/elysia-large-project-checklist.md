# Elysia + Bun 大型项目治理清单

本文提供一份可直接落地的治理清单，帮助 `Elysia + Bun` 在中大型项目中保持可维护性、可测试性和可观测性。

## 1. 目录与分层治理

- 按业务域拆分模块，避免按技术层“全局大平铺”
- 推荐分层：`module(route) -> service -> repository -> datasource`
- 每个模块只暴露入口，不允许跨模块直接读写内部实现
- 公共能力集中在 `shared`（日志、错误模型、鉴权工具、配置）

建议结构（示例）：

```text
api/src
├── app
│   ├── index.ts
│   ├── middleware
│   └── plugins
├── modules
│   ├── user
│   │   ├── user.module.ts
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── user.repository.ts
│   │   └── dto
│   └── article
├── shared
│   ├── errors
│   ├── logger
│   ├── auth
│   └── types
└── infra
    ├── db
    ├── cache
    └── queue
```

## 2. 依赖注入与生命周期

- 统一在应用入口注册 DI，不在路由层手动 `new`
- 将无状态工具与连接类资源注册为单例（Singleton）
- 请求上下文相关对象使用 Scoped 生命周期
- 禁止在业务代码中直接依赖全局变量，统一由 DI 注入

## 3. API 契约与错误规范

- 所有入参用 Zod 校验，禁止“裸入参”
- 统一响应结构：`{ code, message, data, requestId }`
- 统一错误码分层：系统错误、业务错误、权限错误、参数错误
- 为每个接口维护最小契约文档（OpenAPI 或模块级 md）

## 4. 鉴权与安全基线

- 鉴权中间件前置，白名单路由显式声明
- 严禁返回敏感字段（password、token 原文、密钥）
- 启用 CORS、限流、请求体大小限制
- 接口幂等性要求写入规范（尤其支付、回调、重试场景）
- 配置分环境管理，生产密钥只来自环境变量

## 5. 配置与环境管理

- 建立配置中心模块（读取、校验、默认值）
- 启动阶段校验关键环境变量，缺失即 fail fast
- 明确区分 `dev/test/staging/prod` 配置
- 所有端口、连接串、开关项集中定义，禁止散落硬编码

## 6. 日志、指标、追踪（可观测性）

- 接入结构化日志（JSON）并加 `requestId`
- 记录关键事件：登录、写操作、三方调用、异常
- 输出核心指标：QPS、P95/P99、错误率、超时率
- 三方依赖（DB/Redis/HTTP）添加超时、重试和熔断策略
- 统一错误告警入口（钉钉/飞书/Slack/邮件）

## 7. 测试策略

- 单元测试：service/repository 层优先
- 集成测试：核心路由 + 鉴权 + 参数校验 + 错误分支
- 端到端测试：关键业务链路（登录、下单、回调等）
- 为回归高风险点建立“最小必测集”
- CI 至少执行：`typecheck + unit test + integration test`

## 8. 数据层与事务治理

- repository 层封装数据访问，不在 service 直接写 SQL
- 明确事务边界，跨表写入必须有一致性策略
- 读写分离与分页策略提前约定
- 大表查询必须有索引与慢查询监控

## 9. 发布与运行策略

- 构建产物固定化（锁定 lockfile + 构建命令）
- 灰度发布与回滚流程标准化
- 健康检查接口分为：存活检查（liveness）与就绪检查（readiness）
- 进程管理建议：PM2 / systemd / 容器编排
- Nginx/网关层处理 TLS、限流、静态资源与反向代理

## 10. 团队协作规范

- 提交规范（Conventional Commits）
- PR 模板包含：变更说明、风险点、验证步骤
- 代码评审重点：边界、错误处理、可测试性、性能影响
- 架构决策用 ADR 记录，避免口口相传

## 11. 从当前模板升级的优先级路线

- P0：统一错误码与响应模型、加 requestId、补全日志
- P1：补充测试骨架（unit + integration）与 CI
- P2：接入数据库抽象层与事务规范
- P3：接入观测平台（指标 + 告警 + tracing）
- P4：完善发布流程（灰度、回滚、自动化）

## 12. P0 实施步骤（当前已执行）

- Step 1：定义统一错误码与响应模型，统一响应结构为 `{ code, message, requestId, data }`
- Step 2：接入 `requestId` 上下文中间件，支持请求头透传与自动生成
- Step 3：接入结构化日志，输出请求接收、完成、失败三类日志事件
- Step 4：在鉴权失败、参数失败、业务失败、系统异常中统一错误返回
- Step 5：类型检查与接口回归验证，确认前端请求链路兼容

## 13. P1 实施步骤（当前已执行）

- Step 1：新增测试脚本，区分 `test:unit` 与 `test:integration`
- Step 2：补齐 unit 测试骨架（service 层）
- Step 3：补齐 integration 测试骨架（HTTP 路由链路）
- Step 4：新增 CI 工作流，执行 `bun install + typecheck + test`
- Step 5：本地回归验证，确保类型检查与测试通过

## 14. 一句话原则

`Elysia + Bun` 做大项目的关键不是“框架够不够重”，而是“工程规范是否提前建好”。  
只要分层、契约、测试、观测、发布这五件事做扎实，就可以稳定支撑中大型业务。
