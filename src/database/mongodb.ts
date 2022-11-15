import { MongoMemoryServer } from 'mongodb-memory-server'

export class Mongo {
  private static instance: MongoMemoryServer | undefined

  static async Init(client) {
    const user = client.collection('user')
    await user.createIndex({ email: 1 }, { unique: true })

    const contact_log = client.collection('contact_log')
    await contact_log.createIndex({ representative: 1 })

    const product = client.collection('product')
    await product.createIndex({ category: 1 })
    await product.createIndex({ construction_system: 1 })

    const category = client.collection('category')
    await category.createIndex(
      { 'thumbnail.ref': 1 },
      {
        partialFilterExpression: {
          thumbnail: { type: 'product_ref' },
        },
      })
  }

  static async CreateTemporaryConnection() {
    Mongo.instance = await MongoMemoryServer.create({
      instance: { port: 37017 }, // remove the port number when a random port is desired
      binary: { version: '4.4.5' },
    })
    console.log('temp mongo instance URI:', Mongo.TemporaryConnectionUri)
  }

  static get TemporaryConnectionUri() {
    return Mongo.instance ? Mongo.instance.getUri('tempDB') : undefined
  }

  static async CloseTemporaryConnection() {
    const { instance } = Mongo

    if (!instance)
      return

    Mongo.instance = undefined
    await instance.stop()
  }
}
