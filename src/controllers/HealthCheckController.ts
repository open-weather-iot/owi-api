import process from 'node:process'
import { Request, Response } from 'express'
import { Typeorm } from '../database/typeorm'
import { LiveMeasurements } from '../database/models'

export default function Controller(swagger) {
  swagger.get('/health_check')
    .security('internalRequest')
    .action(async (request: Request, response: Response) => {
      const health_check = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now(),
      }

      try {
        await Typeorm.getRepository(LiveMeasurements).count()

        return response.json(health_check)
      } catch (e) {
        console.log(e)
        health_check.message = e

        return response.status(503).json(health_check)
      }
    })
}
