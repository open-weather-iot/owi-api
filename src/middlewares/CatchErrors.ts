import { LOG_EVENTS } from '../helper/logger'
import { RequestWithLogger } from './LogRequests'
import type { Response, NextFunction } from 'express'

export default function CatchErrors(): any {
  return (err: Error, req: RequestWithLogger, res: Response, _next: NextFunction) => {
    req.logger.error(LOG_EVENTS.INTERNAL, { stack: err.stack })
    res.status(500).json({ error: 'INTERNAL' })
  }
}
