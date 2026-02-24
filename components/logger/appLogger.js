require('dotenv').config();
const { createLogger, format, transports } = require('winston');
require('winston-mongodb');

const logLevel = process.env.LOG_LEVEL || 'info';

const redactSensitive = format((info) => {
  const serialized = JSON.stringify(info);
  const redacted = serialized
    .replace(/(api[_-]?key|token|authorization|password)"\s*:\s*"[^"]+"/gi, '$1":"[REDACTED]"')
    .replace(/(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, '$1[REDACTED]');
  return JSON.parse(redacted);
});

const baseFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  redactSensitive(),
  format.printf(({ timestamp, level, message, context, ...meta }) => {
    const contextLabel = context ? `[${context}]` : '';
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level.toUpperCase()} ${contextLabel} ${message}${metaString}`.trim();
  }),
);

const loggerTransports = [
  new transports.Console({
    level: logLevel,
  }),
];

if (process.env.LOG_FILE_PATH) {
  loggerTransports.push(
    new transports.File({
      filename: process.env.LOG_FILE_PATH,
      level: logLevel,
    }),
  );
}

if (process.env.DB_URL) {
  loggerTransports.push(
    new transports.MongoDB({
      level: process.env.MONGO_LOG_LEVEL || logLevel,
      db: process.env.DB_URL,
      collection: process.env.MONGO_LOG_COLLECTION || 'integration_logs',
      tryReconnect: true,
      options: { useUnifiedTopology: true },
      metaKey: 'details',
      format: format.combine(
        format.timestamp(),
        redactSensitive(),
        format.json(),
      ),
    }),
  );
}

const logger = createLogger({
  level: logLevel,
  defaultMeta: { service: 'xcellimark-idx-integration' },
  format: baseFormat,
  transports: loggerTransports,
});

const createContextLogger = (context) => ({
  info: (message, meta = {}) => logger.info(message, { context, ...meta }),
  warn: (message, meta = {}) => logger.warn(message, { context, ...meta }),
  error: (message, meta = {}) => logger.error(message, { context, ...meta }),
  debug: (message, meta = {}) => logger.debug(message, { context, ...meta }),
});

module.exports = {
  logger,
  createContextLogger,
};
