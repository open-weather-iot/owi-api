import { Request, Response } from 'express'
import { Typeorm } from '../database/typeorm'
import { nanoid } from 'nanoid'
import { ApiToken } from '../database/models'

export default function Controller(swagger) {
  Typeorm.getRepository(ApiToken).count()
    .then((tokens_count) => {
      if (tokens_count === 0)
        Typeorm.getRepository(ApiToken).insert({ _id: nanoid(21), description: 'root api key', usage: 'tokens-manager' })
          .then((new_api_token) => console.log('root api key: ', new_api_token.identifiers[0]._id))
    })

  swagger.delete('/api-key/:api_key')
    .security('apiTokensManager')
    .action(async (request: Request, response: Response) => {
      const deleteResult = await Typeorm.getRepository(ApiToken).delete({ _id: String(request.params.api_key) })

      return response.json({ ok: true, affected: deleteResult.affected })
    })

  swagger.post('/api-key')
    .security('apiTokensManager')
    .action(async (request: Request, response: Response) => {
      const { description, usage } = request.body

      if (!['publish'].includes(usage))
        return response.json({ err: 'unknown token usage' })

      const new_api_token = await Typeorm.getRepository(ApiToken).insert({ _id: nanoid(21), description: `(user provided description): ${description}`, usage: String(usage) })

      return response.json({ ok: true, api_key: new_api_token.identifiers[0]._id })
    })

  swagger.post('/api-key/rotate')
  .security('apiToken')
    .action(async (request: Request, response: Response) => {
      const api_token: ApiToken = await Typeorm.getRepository(ApiToken).findOne({ where: { _id: (request as any).api_token._id } }) as any
      if (api_token.deleted)
        return response.status(403).json({ err: 'auth', message: 'token deleted' })

      const new_api_token = await Typeorm.getRepository(ApiToken).insert({ _id: nanoid(21), description: api_token.description, usage: api_token.usage, rotation: ++api_token.rotation, parent: api_token._id })
      await Typeorm.getRepository(ApiToken).update({ _id: api_token._id }, { deleted: true })

      return response.json({ ok: true, api_key: new_api_token.identifiers[0]._id })
    })
}
