import type { Request, Response } from 'express'
import Service from '../services/TokenService'

export default function Controller(swagger) {
  const service = new Service()

  service.initialize()

  swagger.delete('/api-key/:api_key')
    .security('apiTokensManager')
    .action(async (request: Request, response: Response) => {
      const { status, data } = await service.deleteApiKey({ api_key: String(request.params.api_key) })

      return response.status(status).json(data)
    })

  swagger.post('/api-key')
    .security('apiTokensManager')
    .action(async (request: Request, response: Response) => {
      const { status, data } = await service.createApiKey(request.body)

      return response.status(status).json(data)
    })

  swagger.post('/api-key/rotate')
    .security('apiToken')
    .action(async (request: Request, response: Response) => {
      const { status, data } = await service.rotateApiKey({ api_token_id: (request as any).api_token._id })

      return response.status(status).json(data)
    })
}
