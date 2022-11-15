import process from 'node:process'
import { Mongo } from './mongodb'
import { Typeorm } from './typeorm'
//import defaultSeeds from './default_seeds/index'
import productionSeeds from './production_seeds/index'
import developmentSeeds from './development_seeds/index'

export async function Init(swagger, options) {
  const use_local_db = process.env.NODE_ENV === 'local'

  if (use_local_db)
    await Mongo.CreateTemporaryConnection()

  await Typeorm.Init(swagger, { ...options, use_local_db })

  //await defaultSeeds()

  if (process.env.NODE_ENV === 'local')
    await developmentSeeds()
  else
    await productionSeeds()
}

export async function Teardown() {
  await Typeorm.Teardown()
  await Mongo.CloseTemporaryConnection()
}
