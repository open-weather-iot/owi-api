import type { Request, Response } from 'express'
import Service from '../services/HealthCheckService'

export default function Controller(swagger) {
  const service = new Service()

  swagger.get('/health_check')
    .security('internalRequest')
    .action(async (request: Request, response: Response) => {
      const { status, data } = await service.healthCheck()

      return response.status(status).json(data)
    })
}
