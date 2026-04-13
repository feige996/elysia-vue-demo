---
name: 'eden-api-fastcheck'
description: 'Provides a fast checklist and command sequence for adding Eden APIs. Invoke when user wants to quickly add/modify interfaces and run required validations.'
---

# Eden API Fast Check

用于本仓库的“快速执行版”接口工作流。  
目标：在最短路径内完成接口新增/变更并通过验证。

## 何时使用

在以下场景优先调用：

- 用户说“加一个接口/改一个接口，快速处理”
- 用户只要执行清单，不需要长文档解释
- 用户要确认“这次改动是否可提测/可提交”

## 快速步骤（必须按顺序）

1. 后端契约变更
   - 更新 `dto`（zod）
   - 更新 `module` 路由 schema（`params/query/body/response`）
   - 更新 `controller/service/repository` 逻辑
2. 前端模块变更
   - 更新 `web/src/api/modules/<module>.ts`
   - 更新 `admin/src/api/modules/<module>.ts`（如后台需要）
   - 页面层只调用 modules，不直接发请求
3. 类型复用检查
   - 优先复用 `api/src/shared/types/entities.ts`
   - 删除重复手写实体类型
4. 命令验证
   - `bun run typecheck`
   - `bun run test:integration`
   - `bun run --cwd api openapi:generate`（接口有变更时）
5. 漂移检查
   - 确认 `api/openapi.generated.json` 是否应提交
   - 确认无遗漏文件改动

## 快速命令模板

```bash
bun run typecheck
bun run test:integration
bun run --cwd api openapi:generate
git status --short
```

## 通过标准

- typecheck 通过
- integration 通过
- Eden 类型可推导（前端不再报接口类型错误）
- 页面未绕过 `api/modules/*`

## 一句话标准

先补后端契约，再改前端 modules，最后跑三条命令验证。
