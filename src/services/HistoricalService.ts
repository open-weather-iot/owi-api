import { Typeorm } from '../database/typeorm'
import { LiveMeasurements } from '../database/models'

export default class Service {
  private liveMeasurementsRepository = Typeorm.getRepository(LiveMeasurements)

  async getHourly() {
    const data = await this.liveMeasurementsRepository.find({})

    return { status: 200, data }
  }

  async getDaily() {
    const data = await this.liveMeasurementsRepository.find({})

    return { status: 200, data }
  }

  async getMonthly() {
    const data = await this.liveMeasurementsRepository.find({})

    return { status: 200, data }
  }
}
