import { Typeorm } from '../typeorm'
import { ApiToken } from '../models/api_token'

const collection_name = 'ApiToken-typeorm'

export default () =>
  Typeorm.getRepository(ApiToken).save([{
    _id: '',
    description: '(user provided description): undefined',
    usage: 'publish',
  }])
    .then(() => console.log(`${collection_name} created`))
    .catch(() => console.log(`${collection_name} exists`))
