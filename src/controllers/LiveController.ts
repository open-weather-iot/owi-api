import type { Request, Response } from 'express'
import type { WebSocketServer } from 'ws'
import Service from '../services/LiveService'

export default function Controller(swagger, wss: WebSocketServer) {
  const service = new Service()

  wss.on('connection', (ws, request) => {
    console.log('connected!')

    //if (request.headers['api-key'] !== 'aa')
    //  return ws.close(4413, 'not authenticated')

    switch (request.url) {
      case '/subscribe':
        return service.handleNewSubscriber(ws, request)

      default:
        return ws.close(4404, 'not found')
    }
  })

  swagger.post('/webhook/publish')
    .security('apiTokenPublish')
    .action(async (request: Request, response: Response) => {
      const { status, data } = await service.webhookPublishMeasurement(request.body)

      return response.status(status).json(data)
    })

  swagger.post('/publish')
    .security('apiTokenPublish')
    .action(async (request: Request, response: Response) => {
      const { status, data } = await service.publishMeasurement({ ...request.body, timestamp: new Date().toISOString() })

      return response.status(status).json(data)
    })

  swagger.get('/dataseries')
    //.security('aa')
    .action(async (request: Request, response: Response) => {
      const { status, data } = await service.getDataseries()

      return response.status(status).json(data)
    })
}
