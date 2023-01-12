import { nanoid } from 'nanoid'
import { Typeorm } from '../database/typeorm'
import { ApiToken } from '../database/models'

export default class Service {
  private apiTokenRepository = Typeorm.getRepository(ApiToken)

  async initialize() {
    return this.apiTokenRepository.count()
      .then((tokens_count) => {
        if (tokens_count === 0) {
          this.apiTokenRepository.insert({ _id: nanoid(21), description: 'root api key', usage: 'tokens-manager' })
            .then((new_api_token) => console.log('root api key: ', new_api_token.identifiers[0]._id))
        }
      })
  }

  async deleteApiKey(opts: { api_key: string }) {
    const deleteResult = await this.apiTokenRepository.delete({ _id: opts.api_key })

    return { status: 200, data: { ok: true, affected: deleteResult.affected } }
  }

  async createApiKey(opts: { description: string, usage: string }) {
    if (!['publish'].includes(opts.usage))
      return { status: 400, data: { err: 'unknown token usage' } }

    const new_api_token = await this.apiTokenRepository.insert({ _id: nanoid(21), description: `(user provided description): ${opts.description}`, usage: opts.usage })

    return { status: 200, data: { ok: true, api_key: new_api_token.identifiers[0]._id } }
  }

  async rotateApiKey(opts: { api_token_id: any }) {
    const api_token: ApiToken = await this.apiTokenRepository.findOne({ where: { _id: opts.api_token_id } }) as any
    if (api_token.deleted)
      return { status: 403, data: { err: 'auth', message: 'token deleted' } }

    const new_api_token = await this.apiTokenRepository.insert({ _id: nanoid(21), description: api_token.description, usage: api_token.usage, rotation: ++api_token.rotation, parent: api_token._id })
    await this.apiTokenRepository.update({ _id: api_token._id }, { deleted: true })

    return { status: 200, data: { ok: true, api_key: new_api_token.identifiers[0]._id } }
  }
}
