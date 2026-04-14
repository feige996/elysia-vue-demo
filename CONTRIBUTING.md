# 参与贡献

## 环境

- 推荐使用与仓库一致的 **Bun** 版本（见根目录 `.bun-version` 与 `package.json` 的 `engines`）。

## 提交前建议

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
