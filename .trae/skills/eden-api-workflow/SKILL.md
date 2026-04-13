---
name: "eden-api-workflow"
description: "Standardizes adding/updating Eden APIs across api/admin/web with contract-first steps. Invoke when user adds business interfaces, refactors API modules, or fixes type drift."
---

# Eden API Workflow

用于这个仓库的 `Elysia + Eden + Vue` 三端模板，目标是保证：

- 后端契约单一真源
- 前后端类型一致
- 变更可回归、可维护、可复制

## 何时使用

在以下场景必须使用本 Skill：

- 新增业务接口（如 user/article/file）
- 调整接口入参或返回结构
- 重构 `api/modules/*` 或 `request.ts` 请求层
- 修复 Eden 类型漂移、OpenAPI 漂移、前后端不一致问题

## 标准流程

## 1. 后端优先（契约先行）

1. 在 `api/src/modules/<module>/dto` 新增或修改 zod schema。
2. 在 `api/src/modules/<module>/<module>.module.ts` 路由声明里补齐：
   - `params`
   - `query`
   - `body`
   - `response`
3. 在 `controller/service/repository` 中实现业务逻辑。
4. 统一返回：`{ code, message, requestId, data }`。

## 2. 前端对接（仅业务封装）

1. 在 `web/src/api/modules/<module>.ts` 增加业务方法。
2. 在 `admin/src/api/modules/<module>.ts` 增加业务方法（如后台需要）。
3. 统一复用 `apiClient.request` / `apiClient.authRequest`。
4. 页面层只调用 `modules/*` 暴露的方法，不写请求细节。

## 3. 类型复用策略

1. 优先复用后端类型（例如 `api/src/shared/types/entities.ts`）。
2. 避免在多个前端文件重复定义 `User/Article` 等实体结构。
3. 仅在页面专属场景定义 ViewModel 类型。

## 4. 验证与回归

在项目根目录执行：

```bash
bun run typecheck
bun run test:integration
bun run --cwd api openapi:generate
```

如有 CI 约束，确保 `api/openapi.generated.json` 无漂移。

## 开发约束

- `request.ts` 只做请求内核（token、refresh、错误归一化、状态封装）。
- 业务接口实现必须放在 `api/modules/*`。
- 新接口变更必须先补后端契约，再写前端调用。
- 任意返回结构变化都要触发 typecheck + integration test。

## 常见错误

- 只改 controller，不补 module response schema，导致 Eden 推导不完整。
- 页面直接请求 API，绕过封装层导致 token/refresh 行为不一致。
- 手写重复实体类型，导致长期漂移。
- 漏跑 `openapi:generate`，CI 漂移失败。

## 最小检查清单

- [ ] 路由契约（params/query/body/response）齐全
- [ ] web/admin `api/modules` 已新增对应方法
- [ ] 页面仅调用 `api/modules` 方法
- [ ] `bun run typecheck` 通过
- [ ] `bun run test:integration` 通过
- [ ] OpenAPI 已同步（如有接口变更）

## 一句话原则

后端 schema 是唯一真源；前端只做业务封装，页面不感知请求细节。
