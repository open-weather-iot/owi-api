import type { Request, Response } from 'express'
import Service from '../services/HistoricalService'

export default function Controller(swagger) {
  const service = new Service()

  swagger.get('/hourly')
    .action(async (request: Request, response: Response) => {
      const { status, data } = await service.getHourly()

      return response.status(status).json(data)
    })

  swagger.get('/daily')
    .action(async (request: Request, response: Response) => {
      const { status, data } = await service.getDaily()

      return response.status(status).json(data)
    })

  swagger.get('/monthly')
    .action(async (request: Request, response: Response) => {
      const { status, data } = await service.getMonthly()

      return response.status(status).json(data)
    })
}
