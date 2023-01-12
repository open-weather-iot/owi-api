import { logger, LOG_EVENTS } from '../helper/logger'
import type { Request, Response, NextFunction } from 'express'
import { nanoid } from 'nanoid'
import { Logger } from 'winston'

export interface RequestWithLogger extends Request {
  logger: Logger
}

export default function LogRequests() {
  return (req: RequestWithLogger, res: Response, next: NextFunction) => {
    const start = new Date()
    const traceId = nanoid()

    req.logger = logger.child({ traceId })

    res.on('finish', () => {
      const end = new Date()
      const elapsedMs = end.getTime() - start.getTime()

      req.logger.info(LOG_EVENTS.REQUEST, {
        method: req.method,
        url: req.url,
        route: req.route?.path,
        statusCode: res.statusCode,
        start: start.toISOString(),
        end: end.toISOString(),
        elapsedMs,
        env: process.env.NODE_ENV,
      })
    })

    next()
  }
}
