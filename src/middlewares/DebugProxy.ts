import type { Request, Response, NextFunction } from 'express'
import httpProxy from 'http-proxy'
import { Typeorm } from '../database/typeorm'
import { DebugProxy as DebugProxyModel } from '../database/models'
import { RequestWithLogger } from './LogRequests'

export default function DebugProxy() {
  const debugProxyRepository = Typeorm.getRepository(DebugProxyModel)
  const proxy = httpProxy.createProxyServer()

  function Send(req: Request, res: Response, url: string) {
    return proxy.web(req, res, {
      target: url,
      preserveHeaderKeyCase: true,
      changeOrigin: true,
    }, (err, request: RequestWithLogger) => request.logger.error('ERROR', { msg: 'error when proxing connection', err }))
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    const target = await debugProxyRepository.findOne({})

    if (target)
      Send(req, res, target.target)
    else
      next()
  }
}
