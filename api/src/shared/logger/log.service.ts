import pino, { type Logger as PinoLogger } from 'pino';

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
    const logger = pino({
        level: process.env.LOG_LEVEL ?? 'info',
    });
    return new LogService(logger);
};
