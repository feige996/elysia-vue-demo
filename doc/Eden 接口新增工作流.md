# Eden 接口新增工作流（长期模板）

## 目标

在 `Elysia + Eden + Vue` 三端模板中，确保新增业务接口时具备：

- 单一契约源（后端路由 schema）
- 前后端类型一致
- 可回归、可维护、可复制

---

## 当前推荐架构

- 后端：`api/src/modules/*`
  - `dto`（zod）
  - `controller`
  - `service/repository`
  - `module`（路由 + `t` 契约）
- 前端：
  - `web/src/api/request.ts`、`admin/src/api/request.ts`：统一请求内核（token、refresh、错误处理）
  - `web/src/api/modules/*`、`admin/src/api/modules/*`：业务接口方法
  - 页面只调用 `modules/*` 暴露的方法

---

## 新增一个业务接口的标准动作

## 1) 后端新增契约与逻辑

1. 在 `dto` 新增或更新 zod schema。
2. 在 `*.module.ts` 路由声明里补齐：
   - `params`
   - `query`
   - `body`
   - `response`
3. 在 `controller/service/repository` 实现业务逻辑。
4. 统一返回结构：`{ code, message, requestId, data }`。

## 2) 前端新增业务方法

1. 在 `web/src/api/modules/<module>.ts` 增加方法。
2. 在 `admin/src/api/modules/<module>.ts` 增加方法（如后台也需要）。
3. 复用 `apiClient.request` / `apiClient.authRequest`，不要在页面直接拼请求。

## 3) 验证与回归

在项目根目录执行：

```bash
bun run typecheck
bun run test:integration
bun run --cwd api openapi:generate
```

如有 CI 约束，确保 `openapi.generated.json` 无漂移。

---

## 开发约束（必须遵守）

- 页面层禁止直接写请求细节，统一走 `api/modules/*`。
- `request.ts` 只做“请求内核”，不放业务接口实现。
- 新接口必须先补路由契约，再写前端调用。
- 任何返回结构变化，都必须触发 typecheck 与集成测试。

---

## 常见坑位

- 只改 controller，不补 `module` 的 `response` schema，导致 Eden 类型不完整。
- 在多个前端文件重复定义 `User/Article` 类型，造成漂移。
- 页面绕过 `api/modules/*` 直接请求，导致 token/refresh 行为不一致。
- 漏跑 `openapi:generate`，CI 出现 drift 报错。

---

## 最小检查清单（每次提测前）

- [ ] 后端路由契约（params/query/body/response）齐全
- [ ] web/admin 对应 modules 方法已新增
- [ ] 页面仅调用 modules 方法
- [ ] `bun run typecheck` 通过
- [ ] `bun run test:integration` 通过
- [ ] OpenAPI 已同步（如有接口变更）

---

## 一句话原则

**后端 schema 是唯一真源，前端只做业务调用封装，页面不感知请求细节。**
