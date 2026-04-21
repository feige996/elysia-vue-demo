/**
 * 测试环境变量预加载脚本（给 bun test 的 --preload 使用）。
 *
 * 作用：
 * - 在运行单元/集成测试前，自动读取 `api/.env` 并注入 `process.env`。
 * - 避免每次执行测试都手动在命令前拼一长串环境变量。
 *
 * 使用方式：
 * - 通过 package.json 脚本接入：
 *   - `bun test --preload ./tests/setup-env.ts`
 *   - `bun test --preload ./tests/setup-env.ts tests/integration`
 *
 * 为什么需要它：
 * - 当前项目的环境配置（例如 `JWT_SECRET`、数据库连接）在模块 import 时就会被校验。
 * - 如果测试进程没有提前加载这些变量，会在测试启动阶段直接报错（还没跑到用例）。
 *
 * 设计原则：
 * - 不覆盖“外部已显式传入”的环境变量（CI 或本地命令行优先）。
 * - 只做最小解析：支持 `KEY=VALUE`、跳过空行/注释、处理简单引号包裹。
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 以当前工作目录（api）为基准定位 .env 文件
const envPath = resolve(process.cwd(), '.env');

if (existsSync(envPath)) {
  // 读取整个 .env 文本并逐行解析
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    // 跳过空行与注释行（以 # 开头）
    if (!trimmed || trimmed.startsWith('#')) continue;

    // 仅处理形如 KEY=VALUE 的行；没有等号或 key 为空则忽略
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    // 不覆盖已有变量：命令行/CI 注入优先级高于 .env
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(eqIndex + 1).trim();

    // 支持简单引号包裹值，例如 KEY="abc" 或 KEY='abc'
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // 注入到当前测试进程
    process.env[key] = value;
  }
}

// Keep test behavior deterministic in CI when api/.env is absent.
process.env.FEATURE_IP_BLACKLIST_ENABLED ??= 'true';
