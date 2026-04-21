# 参与贡献

## 环境

- 推荐使用与仓库一致的 **Bun** 版本（见根目录 `.bun-version` 与 `package.json` 的 `engines`）。

## 提交前建议

克隆仓库并在根目录执行 `bun install` 后，会通过 **Husky** 安装 Git 钩子：`pre-commit` 会对**已暂存**的文件运行 **lint-staged**：

1. **格式化**：`oxfmt`（TS/JS/JSON 等）+ 对 `*.vue` / `*.md` 的 **Prettier**（与根目录 `format` 分工一致），并自动把改动写回暂存区。
2. **静态检查**：对暂存的 `*.{ts,mts,cts,tsx,js,mjs,cjs}` 与 `*.vue` 再跑 **`oxlint`**（与根目录 `bun run lint` 一致；出现 **error** 时命令失败并在终端输出位置与规则）。

若任一步失败，**本次 `git commit` 会直接中止**，终端里会打印对应工具的错误/告警（这就是提交前的提醒；Git 没有系统弹窗，需看终端输出）。**类型检查**仍建议在合并前跑 `bun run dev:check`（或 CI），避免 pre-commit 过慢。

若你跳过安装钩子（例如 `HUSKY=0 git commit`），请自行在提交前运行 `bun run format` 与 `bun run lint`。

与 README 中 **「发布 / 合并前检查」** 一致，至少本地执行：

```bash
bun install
bun run dev:check
bun run test
bun run build
```

可选：运行 `bun run audit` 查看依赖安全报告，并按需升级或评估误报。

## 合并请求

- 保持变更与议题相关，提交信息建议说明动机与影响面。
- CI 通过（类型检查、lint、格式、构建、测试、E2E 等）后再合并。

## 发布与回滚协作约定

- 涉及数据库结构变更时，必须提交 migration 文件，不要在生产流程使用 `db:push`。
- 发布说明应包含：影响范围、迁移步骤、回滚方案、就绪检查结果（`/ready`）。
- 发生回滚时，优先回滚应用版本，再评估是否需要数据库层面的补偿或恢复。

## 测试与 Seed 注意事项

- `api` 的集成测试会先执行 `seedDatabase()`，该流程包含多张表的固定 `id` 种子数据。
- PostgreSQL 的 `serial` 序列不会因为手工插入固定 `id` 自动前移；若不重置序列，后续插入可能触发主键冲突并在集成测试中表现为 `500`。
- 当前仓库已在 `api/src/infra/db/client.ts` 的 `seedDatabase()` 末尾统一执行序列重置（`setval`），请保留这段逻辑。
- 当你新增“带固定 `id` 的 seed 表”时，务必同步把该表加入序列重置列表；否则 CI 可能出现“读取接口正常、写入接口 500”的隐蔽失败。
