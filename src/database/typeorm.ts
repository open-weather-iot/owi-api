import { DataSource } from 'typeorm'
import type { ObjectLiteral, EntityTarget, Repository, MongoRepository } from 'typeorm'
import { Mongo } from './mongodb'
import * as Models from './models'

export class Typeorm {
  private static dataSource: DataSource

  static async Init(_swagger, options?: { use_local_db?: boolean }) {
    if (options === undefined)
      options = {}

    const { use_local_db } = options

    const ds = new DataSource({
      type: 'mongodb',
      url: use_local_db ? Mongo.TemporaryConnectionUri : process.env.MONGODB_URI,
      synchronize: false,
      logging: false,
      entities: Object.values(Models),
      // see: https://stackoverflow.com/a/57547013/20269772
      useNewUrlParser: true,
      useUnifiedTopology: true,
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
