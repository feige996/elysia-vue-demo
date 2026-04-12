# DI 使用说明（Elysia + elysia-di）

本文说明本项目中依赖注入（DI）的作用、适用场景和取舍建议。

## 1. 本项目里 DI 在做什么

在后端入口中，项目通过 `elysia-di` 把以下实例注册到上下文：

- `logService`
- `userRepository`
- `userService`

对应代码位置：

- `api/src/index.ts` 中 `di({ instances: [...] })`
- `api/src/modules/user.ts` 中从 `ctx` 读取 `userService`

这样路由层无需手动创建依赖，只关注业务逻辑。

## 2. 什么时候需要用 DI

满足以下任意情况，建议使用 DI：

- 依赖链变长（Controller -> Service -> Repository -> Client）
- 共享资源增多（日志、数据库、缓存、配置、鉴权服务）
- 需要生命周期管理（Singleton / Scoped / Transient）
- 需要更好的可测试性（测试中替换 mock 实现）
- 多人协作，需要集中装配依赖并统一约束

## 3. 什么时候可以不用 DI

以下场景可先不用 DI：

- 小型 PoC 或脚本，只有少量路由
- 业务逻辑简单，依赖很少且不复用
- 项目目标是极简演示，优先降低抽象层

## 4. 不使用 DI 的代价

如果移除 DI，需要在路由或模块中手动创建依赖，例如手动 `new UserService(...)`。  
这样会带来：

- 依赖创建分散，重复代码变多
- 生命周期难统一管理
- 测试替换依赖成本更高
- 随业务增长，维护复杂度上升

## 5. 本项目建议

当前项目已具备典型分层（Module + Service + Repository），建议保留 DI。  
若未来继续接入数据库、Redis、JWT、消息队列，DI 的价值会进一步放大。

