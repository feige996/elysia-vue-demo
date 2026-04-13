import pino, { type Logger as PinoLogger } from 'pino';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { env } from '../config/env';

type LogMeta = Record<string, unknown>;

export class LogService {
  constructor(
    private readonly pinoLogger: PinoLogger = pino({
      level: env.LOG_LEVEL,
    }),
  ) {}

  info(message: string, meta?: Record<string, unknown>) {
    this.write('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.write('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.write('error', message, meta);
  }

  private write(
    level: 'info' | 'warn' | 'error',
    message: string,
    meta?: LogMeta,
  ) {
    const payload = {
      message,
      ...(meta ?? {}),
      timestamp: new Date().toISOString(),
    };

    if (level === 'info') {
      this.pinoLogger.info(payload);
      return;
    }
    if (level === 'warn') {
      this.pinoLogger.warn(payload);
      return;
    }
    this.pinoLogger.error(payload);
  }
}

export const createLogService = () => {
  const level = env.LOG_LEVEL;
  const isProduction = env.NODE_ENV === 'production';

  const logger = isProduction
    ? (() => {
        const dateTag = new Date().toISOString().slice(0, 10);
        const logFilePath = (() => {
          const configuredPath = env.LOG_FILE_PATH;
          if (configuredPath) {
            return resolve(
              process.cwd(),
              configuredPath.replace('{date}', dateTag),
            );
          }
          const logFileDirectory = resolve(process.cwd(), env.LOG_FILE_DIR);
          const logFilePrefix = env.LOG_FILE_PREFIX;
          return join(logFileDirectory, `${logFilePrefix}-${dateTag}.log`);
        })();
        mkdirSync(dirname(logFilePath), { recursive: true });
        return pino({ level }, pino.destination(logFilePath));
      })()
    : pino({ level });

  return new LogService(logger);
};

export const logService = createLogService();
