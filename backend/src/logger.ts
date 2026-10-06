export type LogContext = Record<string, unknown>;

type LogLevel = 'info' | 'warn' | 'error';

export interface Logger {
  info(event: string, context?: LogContext): void;
  warn(event: string, context?: LogContext): void;
  error(event: string, context?: LogContext): void;
}

export type LineWriter = (line: string) => void;

const writeToStdout: LineWriter = (line) => process.stdout.write(`${line}\n`);

export function createJsonLogger(write: LineWriter = writeToStdout): Logger {
  const log = (level: LogLevel, event: string, context: LogContext = {}) =>
    write(JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...context }));

  return {
    info: (event, context) => log('info', event, context),
    warn: (event, context) => log('warn', event, context),
    error: (event, context) => log('error', event, context),
  };
}
