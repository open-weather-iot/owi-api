import process from 'node:process'
import { Typeorm } from '../database/typeorm'
import { LiveMeasurements } from '../database/models'

export default class Service {
  private liveMeasurementsRepository = Typeorm.getRepository(LiveMeasurements)

  async healthCheck() {
    const health_check = {
      uptime: process.uptime(),
      message: 'OK',
      timestamp: Date.now(),
    }

    try {
      await this.liveMeasurementsRepository.count()

      return { status: 200, data: health_check }
    } catch (e) {
      console.log(e)
      health_check.message = e

      return { status: 503, data: health_check }
    }
  }
}
