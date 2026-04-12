import pino, { type Logger as PinoLogger } from 'pino';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

type LogMeta = Record<string, unknown>;

export class LogService {
    constructor(
        private readonly pinoLogger: PinoLogger = pino({
            level: process.env.LOG_LEVEL ?? 'info',
        }),
    ) {}

    info(message: string, meta?: Record<string, unknown>) {
        this.write('info', message, meta);
    }

    error(message: string, meta?: Record<string, unknown>) {
        this.write('error', message, meta);
    }

    private write(level: 'info' | 'error', message: string, meta?: LogMeta) {
        const payload = {
            message,
            ...(meta ?? {}),
            timestamp: new Date().toISOString(),
        };

        if (level === 'info') {
            this.pinoLogger.info(payload);
            return;
        }
        this.pinoLogger.error(payload);
    }
}

export const createLogService = () => {
    const level = process.env.LOG_LEVEL ?? 'info';
    const isProduction = process.env.NODE_ENV === 'production';

    const logger = isProduction
        ? (() => {
              const dateTag = new Date().toISOString().slice(0, 10);
              const logFilePath = (() => {
                  const configuredPath = process.env.LOG_FILE_PATH;
                  if (configuredPath) {
                      return resolve(process.cwd(), configuredPath.replace('{date}', dateTag));
                  }
                  const logFileDirectory = resolve(process.cwd(), process.env.LOG_FILE_DIR ?? 'logs');
                  const logFilePrefix = process.env.LOG_FILE_PREFIX ?? 'app';
                  return join(logFileDirectory, `${logFilePrefix}-${dateTag}.log`);
              })();
              mkdirSync(dirname(logFilePath), { recursive: true });
              return pino({ level }, pino.destination(logFilePath));
          })()
        : pino({ level });

    return new LogService(logger);
};
