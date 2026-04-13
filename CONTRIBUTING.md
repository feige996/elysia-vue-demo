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
