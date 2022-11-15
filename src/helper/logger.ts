import config from 'config'
import winston, { type transport } from 'winston'

export const logger = winston.createLogger({
  defaultMeta: { service: config.get('appName') },
  transports: [
    // write all logs with importance level of `error`
    new winston.transports.File({ filename: config.get('logger.errorFile'), level: 'error' }),

    // write all logs
    new winston.transports.File({ filename: config.get('logger.combinedFile') }),

    // if we're in local then log to the `console`
    //process.env.NODE_ENV === 'local' && new winston.transports.Console({ format: winston.format.simple() }),
    // TODO: print to console only in local env
    new winston.transports.Console({ format: winston.format.simple() }),
  ].filter(Boolean) as transport[],
})

export const LOG_EVENTS = {
  REQUEST: 'REQUEST',
  INTERNAL: 'INTERNAL',
  NOT_FOUND: 'NOT_FOUND',
}
