import { LOG_EVENTS } from '../helper/logger'
import { RequestWithLogger } from './LogRequests'
import type { Response, NextFunction } from 'express'

export default function CatchErrors(options?: {}): any {
  return (err: Error, req: RequestWithLogger, res: Response, next: NextFunction) => {
    req.logger.error(LOG_EVENTS.INTERNAL, { stack: err.stack })
    res.status(500).json({ error: 'INTERNAL' })
  }
}
