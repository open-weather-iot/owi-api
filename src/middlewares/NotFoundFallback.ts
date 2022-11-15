import { LOG_EVENTS } from '../helper/logger'
import { RequestWithLogger } from './LogRequests'
import type { Response, NextFunction } from 'express'

export default function NotFoundFallback(): any {
  return (req: RequestWithLogger, res: Response, _next: NextFunction) => {
    req.logger.info(LOG_EVENTS.NOT_FOUND)
    res.status(404).json()
  }
}
