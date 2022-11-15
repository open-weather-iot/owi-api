import config from 'config'
import { DataSource, EntityManager } from 'typeorm'
import type { ObjectLiteral, EntityTarget, Repository, MongoRepository } from 'typeorm'
import { Mongo } from './mongodb'
//import { Representative } from './models/representative.entity'
import { ApiToken } from './models/api_token'
import { LiveMeasurements } from './models/live_measurements'
import { Aggregation10m } from './models/aggregation_10m'

/*
const repository = Typeorm.getRepository(Representative)
repository.findOne({})
 */
export class Typeorm {
  private static dataSource: DataSource

  static async Init(swagger, options?: { use_local_db?: boolean }) {
    if (options === undefined)
      options = {}

    const { use_local_db } = options

    const ds = new DataSource({
      type: 'mongodb',
      url: use_local_db ? Mongo.TemporaryConnectionUri : process.env.MONGODB_URI,
      synchronize: false,
      logging: false,
      entities: [
        ApiToken,
        LiveMeasurements,
        Aggregation10m,
      ],
    })

    await ds.initialize()

    Typeorm.dataSource = ds
  }

  static getRepository<Entity extends ObjectLiteral>(target: EntityTarget<Entity>): Repository<Entity> {
    return Typeorm.dataSource.getRepository(target)
  }

  static getMongoRepository<Entity extends ObjectLiteral>(target: EntityTarget<Entity>): MongoRepository<Entity> {
    return Typeorm.dataSource.getMongoRepository(target)
  }

  static async Teardown() {
    return Typeorm.dataSource.destroy()
  }
}
